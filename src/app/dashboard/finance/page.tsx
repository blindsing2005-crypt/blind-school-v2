"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Loader2, Wallet, CheckCircle2, Search, Printer, X, History, Settings, Check
} from "lucide-react";

export default function FinancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tracking" | "history" | "fees">("tracking");
  const [user, setUser] = useState<any>(null);
  const [actualSchoolId, setActualSchoolId] = useState("");
  const [username, setUsername] = useState("");
  const [userRole, setUserRole] = useState("");
  
  // Données
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [optionsList, setOptionsList] = useState<any[]>([]);
  const [schoolInfo, setSchoolInfo] = useState({ school_name: "École", address: "", logo_url: "", currency: "FC" });
  const [activeYear, setActiveYear] = useState<any>(null);

  // Filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterOption, setFilterOption] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState(""); 

  // Modal de paiement
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  
  // Sous-modal pour saisir le montant d'une tranche
  const [selectedFeeToPay, setSelectedFeeToPay] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal Reçu
  const [receiptData, setReceiptData] = useState<any>(null);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");
    setUser(user);

    const { data: userProfile } = await supabase.from("school_users").select("school_id, username, role, permissions").eq("email", user.email).maybeSingle();
    
    if (userProfile && !userProfile.permissions?.finance) {
      alert("⛔ Accès refusé. Vous n'avez pas la permission de voir les finances.");
      return router.push("/dashboard");
    }

    const schoolIdToUse = userProfile?.school_id || user.id;
    setActualSchoolId(schoolIdToUse);
    setUsername(userProfile?.username || "Administrateur");
    setUserRole(userProfile?.role || "Administrateur");

    const [studentsRes, paymentsRes, feesRes, schoolRes, yearsRes, classesRes, optionsRes] = await Promise.all([
      supabase.from("students").select("*").eq("school_id", schoolIdToUse),
      supabase.from("payments").select(`*, students ( * ), fees ( name )`).eq("school_id", schoolIdToUse).order("created_at", { ascending: false }),
      supabase.from("fees").select("*").eq("school_id", schoolIdToUse),
      supabase.from("school_settings").select("*").eq("school_id", schoolIdToUse).single(),
      supabase.from("academic_years").select("*").eq("school_id", schoolIdToUse).eq("is_active", true),
      supabase.from("classes").select("*").eq("school_id", schoolIdToUse),
      supabase.from("options").select("*").eq("school_id", schoolIdToUse)
    ]);

    if (studentsRes.data) setStudents(studentsRes.data);
    if (paymentsRes.data) setPayments(paymentsRes.data);
    if (feesRes.data) setFees(feesRes.data);
    if (schoolRes.data) {
      setSchoolInfo({ 
        school_name: schoolRes.data.school_name || "Mon École", 
        address: schoolRes.data.school_address || "", 
        logo_url: schoolRes.data.school_logo_url || "",
        currency: "FC" 
      });
    }
    if (yearsRes.data && yearsRes.data.length > 0) setActiveYear(yearsRes.data[0]);
    if (classesRes.data) setClasses(classesRes.data);
    if (optionsRes.data) setOptionsList(optionsRes.data);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [router]);

  // --- HELPERS ---
  const getStudentName = (student: any) => {
    if (!student) return "";
    return student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || "Élève inconnu";
  };
  const getStudentMatricule = (student: any) => {
    return student.matricule || student.id.substring(0, 8).toUpperCase();
  };

  // --- CALCULS FINANCIERS ---
  const getStudentFees = (student: any) => fees.filter(f => {
    if (f.level !== student.level) return false;
    if (f.option && f.option !== student.option) return false;
    return true;
  });

  const getStudentPayments = (studentId: string) => payments.filter(p => p.student_id === studentId);

  const calculateStudentBalance = (student: any) => {
    const studentFees = getStudentFees(student);
    const totalDue = studentFees.reduce((sum, f) => sum + Number(f.amount), 0);
    const studentPayments = getStudentPayments(student.id);
    const totalPaid = studentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    return { totalDue, totalPaid, balance: totalDue - totalPaid };
  };

  const getPaidAmountForFee = (studentId: string, feeId: string) => {
    const studentPayments = getStudentPayments(studentId);
    return studentPayments.filter(p => p.fee_id === feeId).reduce((sum, p) => sum + Number(p.amount), 0);
  };

  // --- ACTIONS DE PAIEMENT ---
  const openStudentAccount = (student: any) => {
    setSelectedStudent(student);
    setSelectedFeeToPay(null);
    setPaymentAmount("");
    setIsPaymentModalOpen(true);
  };

  const initiatePaymentForFee = (fee: any) => {
    setSelectedFeeToPay(fee);
    const alreadyPaid = getPaidAmountForFee(selectedStudent.id, fee.id);
    const remaining = Number(fee.amount) - alreadyPaid;
    setPaymentAmount(remaining.toString());
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeeToPay) return;
    setSaving(true);
    
    const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const newPayment = {
      school_id: actualSchoolId,
      student_id: selectedStudent.id, 
      fee_id: selectedFeeToPay.id,
      amount: parseFloat(paymentAmount),
      receipt_number: receiptNumber,
      academic_year: activeYear?.name || "2024-2025"
    };

    const { data, error } = await supabase.from("payments").insert([newPayment]).select(`*, students ( * ), fees ( name )`);

    if (!error && data) {
      await supabase.from("activity_logs").insert([{
        school_id: actualSchoolId,
        user_name: `${username} (${userRole})`,
        action: "Paiement",
        details: `A encaissé ${Number(paymentAmount).toLocaleString()} FC pour ${getStudentName(selectedStudent)} (${selectedFeeToPay.name})`
      }]);

      await fetchData(); 
      setSelectedFeeToPay(null); 
      setReceiptData(data[0]); 
    } else {
      alert("Erreur : " + error?.message);
    }
    setSaving(false);
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  // --- FILTRAGE ---
  const levels = Array.from(new Set(classes.map(c => c.level)));
  const availableClasses = classes.filter(c => filterLevel === "" || c.level === filterLevel);
  const uniqueClassNames = Array.from(new Set(availableClasses.map(c => c.name))).sort();
  const availableOptions = optionsList.filter(o => filterLevel === "Secondaire" || filterLevel === "");

  const filteredStudents = students.filter(s => {
    const sName = getStudentName(s).toLowerCase();
    const sMatricule = getStudentMatricule(s).toLowerCase();
    const matchSearch = sName.includes(searchQuery.toLowerCase()) || sMatricule.includes(searchQuery.toLowerCase());
    const matchLevel = filterLevel === "" || s.level === filterLevel;
    const matchClass = filterClass === "" || s.class_name === filterClass;
    const matchOption = filterOption === "" || s.option === filterOption;
    
    const { totalPaid, balance } = calculateStudentBalance(s);
    let matchPaymentStatus = true;
    if (filterPaymentStatus === "paid") matchPaymentStatus = balance <= 0;
    if (filterPaymentStatus === "unpaid") matchPaymentStatus = totalPaid === 0;
    if (filterPaymentStatus === "partial") matchPaymentStatus = totalPaid > 0 && balance > 0;

    return matchSearch && matchLevel && matchClass && matchOption && matchPaymentStatus;
  });

  const filteredStats = filteredStudents.reduce((acc, student) => {
    const { totalDue, totalPaid, balance } = calculateStudentBalance(student);
    return { 
      totalDue: acc.totalDue + totalDue, 
      totalPaid: acc.totalPaid + totalPaid, 
      balance: acc.balance + balance 
    };
  }, { totalDue: 0, totalPaid: 0, balance: 0 });

  const filteredPayments = payments.filter(p => {
    if (!p.students) return false;
    const pName = getStudentName(p.students).toLowerCase();
    const matchSearch = pName.includes(searchQuery.toLowerCase());
    const matchLevel = filterLevel === "" || p.students.level === filterLevel;
    const matchClass = filterClass === "" || p.students.class_name === filterClass;
    const matchOption = filterOption === "" || p.students.option === filterOption;
    return matchSearch && matchLevel && matchClass && matchOption;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* --- EN-TÊTE D'IMPRESSION UNIQUEMENT --- */}
      <div className="hidden print:block mb-8 border-b-2 border-slate-800 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {schoolInfo?.logo_url && <img src={schoolInfo.logo_url} className="w-16 h-16 object-contain" />}
            <div>
              <h1 className="text-2xl font-black uppercase">{schoolInfo.school_name}</h1>
              <p className="text-sm font-bold">Année : {activeYear?.name}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase">Situation Financière</h2>
            <p className="text-sm">Imprimé le {new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-between bg-slate-100 p-4 rounded-lg">
          <div><span className="font-bold text-sm">Total Attendu :</span> <span className="font-black">{filteredStats.totalDue.toLocaleString()} {schoolInfo.currency}</span></div>
          <div><span className="font-bold text-sm">Total Encaissé :</span> <span className="font-black text-emerald-700">{filteredStats.totalPaid.toLocaleString()} {schoolInfo.currency}</span></div>
          <div><span className="font-bold text-sm">Solde Restant :</span> <span className="font-black text-red-700">{filteredStats.balance.toLocaleString()} {schoolInfo.currency}</span></div>
        </div>
        <div className="mt-2 text-sm font-semibold">
          Filtres : {filterLevel || "Tous niveaux"} | {filterClass || "Toutes classes"} | {filterOption || "Toutes options"}
        </div>
      </div>

      {/* EN-TÊTE ET ONGLETS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Paiements & Minerval</h1>
          <p className="text-slate-500 text-sm">Gestion des tranches et reçus</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* ✅ BOUTON IMPRIMER */}
          <button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md">
            <Printer className="w-4 h-4" /> Imprimer
          </button>

          <button onClick={() => setActiveTab("tracking")} className={`px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${activeTab === "tracking" ? "bg-blue-600 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}><Wallet className="w-4 h-4" /> Suivi</button>
          <button onClick={() => setActiveTab("history")} className={`px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${activeTab === "history" ? "bg-blue-600 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}><History className="w-4 h-4" /> Historique</button>
          <button onClick={() => setActiveTab("fees")} className={`px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${activeTab === "fees" ? "bg-blue-600 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}><Settings className="w-4 h-4" /> Voir Tarifs</button>
        </div>
      </div>

      {/* STATS DYNAMIQUES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 border-l-4 border-l-slate-800 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 uppercase">Total Attendu</p>
          <p className="text-3xl font-black text-slate-800 mt-1">{filteredStats.totalDue.toLocaleString()} {schoolInfo.currency}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 border-l-4 border-l-emerald-500 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 uppercase">Total Encaissé</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{filteredStats.totalPaid.toLocaleString()} {schoolInfo.currency}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 border-l-4 border-l-red-500 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 uppercase">Solde Restant</p>
          <p className="text-3xl font-black text-red-600 mt-1">{filteredStats.balance.toLocaleString()} {schoolInfo.currency}</p>
        </div>
      </div>

      {/* FILTRES */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center print:hidden">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <input type="text" placeholder="Rechercher un élève..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        
        <select value={filterLevel} onChange={(e) => { setFilterLevel(e.target.value); setFilterClass(""); setFilterOption(""); }} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-semibold">
          <option value="">Tous les niveaux</option>
          {levels.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        <select value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setFilterOption(""); }} disabled={!filterLevel} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-semibold disabled:opacity-50">
          <option value="">Toutes les classes</option>
          {uniqueClassNames.map(name => <option key={name} value={name}>{name}</option>)}
        </select>

        <select value={filterOption} onChange={(e) => setFilterOption(e.target.value)} disabled={filterLevel === "" || filterLevel === "Maternelle" || filterLevel === "Primaire"} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-semibold disabled:opacity-50">
          <option value="">Toutes les options</option>
          {availableOptions.map(opt => <option key={opt.id} value={opt.name}>{opt.name}</option>)}
        </select>

        {activeTab === "tracking" && (
          <select value={filterPaymentStatus} onChange={(e) => setFilterPaymentStatus(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-blue-50 text-blue-900 text-sm font-bold">
            <option value="">Tous les statuts</option>
            <option value="paid">En ordre (Payé)</option>
            <option value="partial">Partiel</option>
            <option value="unpaid">Non payé</option>
          </select>
        )}
      </div>

      {/* SUIVI DES ÉLÈVES */}
      {activeTab === "tracking" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 print:hidden">
            <p className="text-sm font-bold text-slate-700">{filteredStudents.length} élève(s) trouvé(s)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200 print:bg-transparent print:text-slate-800 print:border-slate-800">
                  <th className="p-4 font-semibold">Élève</th>
                  <th className="p-4 font-semibold">Classe / Option</th>
                  <th className="p-4 font-semibold text-right">Total Dû</th>
                  <th className="p-4 font-semibold text-right">Payé</th>
                  <th className="p-4 font-semibold text-right">Solde</th>
                  <th className="p-4 font-semibold text-center">Statut Global</th>
                  <th className="p-4 font-semibold text-right print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                {filteredStudents.map((student) => {
                  const { totalDue, totalPaid, balance } = calculateStudentBalance(student);
                  const isPaid = balance <= 0;
                  const isPartial = totalPaid > 0 && balance > 0;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{getStudentName(student)}</p>
                        <p className="text-xs text-slate-500 font-mono">{getStudentMatricule(student)}</p>
                      </td>
                      <td className="p-4">
                        <span className="inline-block bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold print:bg-transparent print:p-0 print:font-bold">{student.class_name}</span>
                        {student.option && <p className="text-[10px] text-slate-500 mt-1 font-semibold">{student.option}</p>}
                      </td>
                      <td className="p-4 text-right font-semibold text-slate-700">{totalDue.toLocaleString()} {schoolInfo.currency}</td>
                      <td className="p-4 text-right font-semibold text-emerald-600">{totalPaid.toLocaleString()} {schoolInfo.currency}</td>
                      <td className="p-4 text-right font-bold text-red-600">{balance.toLocaleString()} {schoolInfo.currency}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold print:p-0 print:bg-transparent print:text-slate-800 ${isPaid ? 'bg-emerald-100 text-emerald-700' : isPartial ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                          {isPaid ? 'En ordre' : isPartial ? 'Partiel' : 'Non payé'}
                        </span>
                      </td>
                      <td className="p-4 text-right print:hidden">
                        <button onClick={() => openStudentAccount(student)} className="px-4 py-2 rounded-xl font-semibold text-sm transition-colors shadow-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 ml-auto">
                           Gérer / Payer
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-500 italic">Aucun élève ne correspond à ces filtres.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HISTORIQUE DES REÇUS */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
          <div className="p-4 border-b border-slate-100 print:hidden"><h2 className="text-lg font-bold text-slate-800">Tous les reçus</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200 print:bg-transparent print:text-slate-800 print:border-slate-800">
                  <th className="p-4 font-semibold">N° Reçu</th><th className="p-4 font-semibold">Date</th><th className="p-4 font-semibold">Élève</th><th className="p-4 font-semibold">Tranche</th><th className="p-4 font-semibold text-right">Montant</th><th className="p-4 text-right print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-4 text-sm font-mono text-slate-700">{p.receipt_number}</td>
                    <td className="p-4 text-sm text-slate-600">{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="p-4 font-bold text-slate-800">{getStudentName(p.students)}</td>
                    <td className="p-4 text-sm text-slate-600">{p.fees?.name || "N/A"}</td>
                    <td className="p-4 text-right font-bold text-emerald-600">{Number(p.amount).toLocaleString()} {schoolInfo.currency}</td>
                    <td className="p-4 text-right print:hidden">
                      <button onClick={() => setReceiptData(p)} className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1 ml-auto"><Printer className="w-4 h-4" /> Reçu</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VUE DES TARIFS */}
      {activeTab === "fees" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 print:hidden">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Grille Tarifaire</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fees.map(f => (
              <div key={f.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-bold text-blue-600 uppercase">{f.level} {f.option && `- ${f.option}`}</span>
                <h3 className="font-bold text-slate-800 mt-2">{f.name}</h3>
                <p className="text-xl font-black text-slate-900">{Number(f.amount).toLocaleString()} {schoolInfo.currency}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL : COMPTE DE L'ÉLÈVE */}
      {isPaymentModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white">{getStudentName(selectedStudent)}</h2>
                <p className="text-sm text-slate-300">{selectedStudent.class_name} • {selectedStudent.option || "Sans option"}</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-white/80 hover:text-white bg-white/10 rounded-full p-1"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6">
              {!selectedFeeToPay ? (
                <>
                  <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Situation des tranches</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="p-3">Tranche</th>
                          <th className="p-3 text-right">Montant</th>
                          <th className="p-3 text-right">Déjà payé</th>
                          <th className="p-3 text-right">Reste à payer</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {getStudentFees(selectedStudent).map(fee => {
                          const paid = getPaidAmountForFee(selectedStudent.id, fee.id);
                          const remaining = Number(fee.amount) - paid;
                          return (
                            <tr key={fee.id} className={remaining <= 0 ? "bg-emerald-50/50" : "bg-white"}>
                              <td className="p-3 font-semibold text-slate-800">{fee.name}</td>
                              <td className="p-3 text-right">{Number(fee.amount).toLocaleString()} FC</td>
                              <td className="p-3 text-right text-emerald-600">{paid.toLocaleString()} FC</td>
                              <td className="p-3 text-right font-bold text-red-600">{remaining.toLocaleString()} FC</td>
                              <td className="p-3 text-center">
                                {remaining > 0 ? (
                                  <button onClick={() => initiatePaymentForFee(fee)} className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors">
                                    Payer
                                  </button>
                                ) : (
                                  <span className="text-emerald-600 font-bold text-xs flex items-center justify-center gap-1"><Check className="w-4 h-4"/> Payé</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSavePayment}>
                  <div className="bg-blue-50 p-4 rounded-xl mb-6 border border-blue-100">
                    <p className="text-xs text-blue-600 font-bold uppercase mb-1">Paiement de la tranche</p>
                    <h3 className="font-bold text-slate-800 text-lg">{selectedFeeToPay.name}</h3>
                    <p className="text-sm text-slate-600">Montant total dû : {Number(selectedFeeToPay.amount).toLocaleString()} {schoolInfo.currency}</p>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Montant reçu ({schoolInfo.currency})</label>
                    <input required type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 text-lg font-bold" />
                    <p className="text-xs text-slate-500 mt-2">Vous pouvez modifier ce montant si l'élève paie une partie seulement (ex: la moitié).</p>
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setSelectedFeeToPay(null)} className="px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">Annuler</button>
                    <button type="submit" disabled={saving || Number(paymentAmount) <= 0} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Valider le paiement
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL REÇU */}
      {receiptData && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto print:hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-8">
            
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center print:hidden sticky top-0 z-10 shadow-md">
              <div className="flex items-center gap-2 text-emerald-400 font-bold"><CheckCircle2 className="w-5 h-5" /> Paiement Enregistré</div>
              <div className="flex gap-3">
                <button onClick={() => {
                    document.body.classList.add('printing-receipt');
                    window.print();
                    setTimeout(() => document.body.classList.remove('printing-receipt'), 1000);
                  }} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-blue-500 transition-colors shadow-sm"><Printer className="w-4 h-4" /> Imprimer</button>
                <button onClick={() => setReceiptData(null)} className="bg-slate-600 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-slate-500 transition-colors shadow-sm flex items-center gap-2"><X className="w-4 h-4" /> Fermer</button>
              </div>
            </div>

            <div className="print-area bg-white p-8 md:p-14 text-slate-900 font-sans" id="receipt-print-area">
              
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-6 mb-8">
                <div className="flex items-center gap-6">
                  {schoolInfo.logo_url ? (
                    <img src={schoolInfo.logo_url} alt="Logo" className="w-24 h-24 object-contain" />
                  ) : (
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">Logo</div>
                  )}
                  <div>
                    <h1 className="text-xl font-bold uppercase tracking-wider text-slate-600">École</h1>
                    <h2 className="text-3xl font-black uppercase text-blue-900">{schoolInfo.school_name}</h2>
                    <p className="text-sm italic text-slate-500 mt-1">{schoolInfo.address}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-4xl font-black uppercase text-slate-800 tracking-tight">REÇU DE PAIEMENT</h2>
                  <p className="text-slate-500 mt-2 font-medium">Date : <span className="text-slate-800 font-bold">{new Date(receiptData.created_at).toLocaleDateString('fr-FR')}</span></p>
                </div>
                <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg text-lg font-bold text-blue-900">
                  N° {receiptData.receipt_number}
                </div>
              </div>

              <div className="mb-8">
                <div className="bg-blue-100 px-4 py-2 rounded-t-lg font-bold text-blue-900 text-lg">Informations de l'élève</div>
                <div className="border border-slate-200 border-t-0 rounded-b-lg p-6 space-y-2 text-base">
                  <div className="flex"><span className="w-40 font-bold text-slate-600">Nom et prénom</span> <span className="font-bold text-slate-900">: {getStudentName(receiptData.students).toUpperCase()}</span></div>
                  <div className="flex"><span className="w-40 font-bold text-slate-600">Classe</span> <span className="font-bold text-slate-900">: {receiptData.students?.class_name} {receiptData.students?.option && `(${receiptData.students.option})`}</span></div>
                  <div className="flex"><span className="w-40 font-bold text-slate-600">Année scolaire</span> <span className="font-bold text-slate-900">: {receiptData.academic_year || activeYear?.name || "2024-2025"}</span></div>
                </div>
              </div>

              <div className="mb-10">
                <div className="bg-blue-100 px-4 py-2 rounded-t-lg font-bold text-blue-900 text-lg">Détail du paiement</div>
                <table className="w-full border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-blue-50 text-blue-900 border-b border-slate-200">
                      <th className="py-3 px-4 text-left font-bold w-16 border-r border-slate-200 text-center">N°</th>
                      <th className="py-3 px-4 text-left font-bold border-r border-slate-200">Description</th>
                      <th className="py-3 px-4 text-right font-bold w-40">Montant ({schoolInfo.currency})</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-4 px-4 text-center border-r border-slate-200 text-slate-600">1</td>
                      <td className="py-4 px-4 text-slate-800 font-medium">{receiptData.fees?.name || "Frais scolaires"}</td>
                      <td className="py-4 px-4 text-right font-bold text-slate-900">{Number(receiptData.amount).toLocaleString()}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-50">
                      <td colSpan={2} className="py-4 px-4 text-right font-black text-blue-900 text-lg border-r border-slate-200">Montant total payé</td>
                      <td className="py-4 px-4 text-right font-black text-blue-900 text-xl">{Number(receiptData.amount).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="text-center mt-12 pt-6 border-t border-slate-200">
                <p className="italic text-slate-600 font-medium">Veuillez garder jalousement ce reçu.</p>
                <div className="mt-12 flex justify-between px-10">
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-400 uppercase mb-12">Signature du Parent</p>
                    <div className="w-40 border-b border-slate-400"></div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-400 uppercase mb-12">Sceau de l'école</p>
                    <div className="w-40 border-b border-slate-400"></div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}