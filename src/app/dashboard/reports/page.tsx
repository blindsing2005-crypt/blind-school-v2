"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  Loader2, TrendingDown, TrendingUp, Plus, X, CheckCircle2, 
  Printer, Search, Users, Check, AlertCircle, XCircle, Wallet, Trash2, Calendar
} from "lucide-react";

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Données
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [optionsList, setOptionsList] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  
  // Contexte École & Utilisateur
  const [actualSchoolId, setActualSchoolId] = useState("");
  const [username, setUsername] = useState("");
  const [userRole, setUserRole] = useState("");
  const [schoolInfo, setSchoolInfo] = useState({ name: "", address: "", phone: "", logo: "" });
  const [currency, setCurrency] = useState("FC");

  // Filtres
  const [filterLevel, setFilterLevel] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterOption, setFilterOption] = useState("");

  // Modal Dépenses
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: "", amount: "", recipient: "", date: "" 
  });
  const [savingExpense, setSavingExpense] = useState(false);

  useEffect(() => {
    setExpenseForm(prev => ({ 
      ...prev, 
      date: new Date().toISOString().split('T')[0] 
    }));
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const { data: userProfile } = await supabase
      .from("school_users")
      .select("school_id, username, role, permissions")
      .eq("email", user.email)
      .maybeSingle();
      
    if (userProfile && !userProfile.permissions?.reports) {
      alert("⛔ Accès refusé. Vous n'avez pas la permission de voir les rapports financiers.");
      return router.push("/dashboard"); 
    }

    const schoolIdToUse = userProfile?.school_id || user.id;
    setActualSchoolId(schoolIdToUse);
    setUsername(userProfile?.username || "Administrateur");
    setUserRole(userProfile?.role || "Administrateur");

    const [studentsRes, classesRes, optionsRes, feesRes, paymentsRes, expensesRes, schoolRes] = await Promise.all([
      supabase.from("students").select("*").eq("school_id", schoolIdToUse),
      supabase.from("classes").select("*").eq("school_id", schoolIdToUse),
      supabase.from("options").select("*").eq("school_id", schoolIdToUse),
      supabase.from("fees").select("*").eq("school_id", schoolIdToUse),
      supabase.from("payments").select("*").eq("school_id", schoolIdToUse),
      supabase.from("expenses").select("*").eq("school_id", schoolIdToUse).order("expense_date", { ascending: false }),
      supabase.from("school_settings").select("*").eq("school_id", schoolIdToUse).single()
    ]);

    if (studentsRes.data) setStudents(studentsRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    if (optionsRes.data) setOptionsList(optionsRes.data);
    if (feesRes.data) setFees(feesRes.data);
    if (paymentsRes.data) setPayments(paymentsRes.data);
    if (expensesRes.data) setExpenses(expensesRes.data);
    
    if (schoolRes.data) {
      setSchoolInfo({
        name: schoolRes.data.school_name || "Mon École",
        address: schoolRes.data.school_address || "Adresse non définie",
        phone: schoolRes.data.school_phone || "",
        logo: schoolRes.data.school_logo_url || ""
      });
      if (schoolRes.data.currency) setCurrency(schoolRes.data.currency);
    }
    
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [router]);

  // --- LOGIQUE DE FILTRAGE ---
  const filteredStudents = students.filter(s => {
    const matchLevel = filterLevel === "" || s.level === filterLevel;
    const matchClass = filterClass === "" || s.class_name === filterClass;
    const matchOption = filterOption === "" || s.option === filterOption;
    return matchLevel && matchClass && matchOption;
  });

  // ✅ MODIFIÉ : Prise en compte de class_name
  const getStudentFinancials = (student: any) => {
    const studentFees = fees.filter(f => {
      if (f.level !== student.level) return false;
      if (f.class_name && f.class_name !== student.class_name) return false;
      if (f.option && f.option !== student.option) return false;
      return true;
    });
    const totalDue = studentFees.reduce((sum, f) => sum + Number(f.amount), 0);
    const studentPayments = payments.filter(p => p.student_id === student.id);
    const totalPaid = studentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = totalDue - totalPaid;
    let status = "Non payé";
    if (balance <= 0 && totalDue > 0) status = "Payé";
    else if (totalPaid > 0 && balance > 0) status = "Partiel";
    return { totalPaid, status };
  };

  let countPaid = 0, countPartial = 0, countUnpaid = 0;
  filteredStudents.forEach(s => {
    const { status } = getStudentFinancials(s);
    if (status === "Payé") countPaid++;
    else if (status === "Partiel") countPartial++;
    else countUnpaid++;
  });

  // --- LOGIQUE FINANCIÈRE GLOBALE ET PÉRIODIQUE ---
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const startOfWeek = new Date(now.setDate(now.getDate() - dayOfWeek + 1)).toISOString().split('T')[0];
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];

  const getFinancialsForPeriod = (startDate: string) => {
    const periodPayments = payments.filter(p => p.created_at && p.created_at.split('T')[0] >= startDate);
    const periodExpenses = expenses.filter(e => e.expense_date && e.expense_date >= startDate);
    const totalIn = periodPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalOut = periodExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    return { totalIn, totalOut, net: totalIn - totalOut };
  };

  const statsToday = getFinancialsForPeriod(todayStr);
  const statsWeek = getFinancialsForPeriod(startOfWeek);
  const statsMonth = getFinancialsForPeriod(startOfMonth);
  const statsYear = getFinancialsForPeriod(startOfYear);
  
  const totalAllTimeIn = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAllTimeOut = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalNet = totalAllTimeIn - totalAllTimeOut;

  const maxGraph = Math.max(totalAllTimeIn, totalAllTimeOut) || 1;
  const percentIn = (totalAllTimeIn / maxGraph) * 100;
  const percentOut = (totalAllTimeOut / maxGraph) * 100;

  // --- AJOUTER UNE DÉPENSE ---
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingExpense(true);

    const { error } = await supabase.from("expenses").insert([{
      school_id: actualSchoolId,
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount), 
      recipient: expenseForm.recipient,
      expense_date: expenseForm.date
    }]);

    if (!error) {
      await supabase.from("activity_logs").insert([{
        school_id: actualSchoolId,
        user_name: `${username} (${userRole})`,
        action: "Dépense",
        details: `A enregistré une dépense de ${Number(expenseForm.amount).toLocaleString()} ${currency} (${expenseForm.description})`
      }]);

      setIsExpenseModalOpen(false);
      setExpenseForm({ description: "", amount: "", recipient: "", date: todayStr });
      fetchData();
    } else { alert("Erreur : " + error.message); }
    setSavingExpense(false);
  };

  // --- SUPPRIMER UNE DÉPENSE ---
  const handleDeleteExpense = async (id: string, description: string, amount: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cette dépense ?")) return;
    
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    
    if (!error) {
      await supabase.from("activity_logs").insert([{
        school_id: actualSchoolId,
        user_name: `${username} (${userRole})`,
        action: "Suppression Dépense",
        details: `A supprimé la dépense : ${description} (${amount.toLocaleString()} ${currency})`
      }]);

      setExpenses(expenses.filter(e => e.id !== id));
    } else {
      alert("Erreur lors de la suppression : " + error.message);
    }
  };

  const uniqueLevels = Array.from(new Set(classes.map(c => c.level)));
  const availableClasses = classes.filter(c => filterLevel === "" || c.level === filterLevel);
  const uniqueClassNames = Array.from(new Set(availableClasses.map(c => c.name))).sort();
  const availableOptions = optionsList.filter(o => filterLevel === "Secondaire" || filterLevel === "");

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* BOUTONS D'ACTION (Masqués à l'impression) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Rapports Financiers</h1>
          <p className="text-slate-500 text-sm">Analyse de trésorerie et bilans de l'établissement</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/finance" className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all">
            <Wallet className="w-5 h-5" /> Aller aux paiements
          </Link>
          <button onClick={() => window.print()} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all">
            <Printer className="w-5 h-5" /> Imprimer
          </button>
          <button onClick={() => setIsExpenseModalOpen(true)} className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all">
            <Plus className="w-5 h-5" /> Dépense
          </button>
        </div>
      </div>

      {/* --- EN-TÊTE OFFICIEL POUR L'IMPRESSION --- */}
      <div className="hidden print:flex items-center justify-between border-b-4 border-slate-800 pb-6 mb-8">
        <div className="flex items-center gap-6">
          {schoolInfo.logo ? (
            <img src={schoolInfo.logo} alt="Logo" className="w-24 h-24 object-contain" />
          ) : (
            <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500">Logo</div>
          )}
          <div>
            <h1 className="text-3xl font-black uppercase text-slate-900">{schoolInfo.name}</h1>
            <p className="text-slate-600 font-medium">{schoolInfo.address}</p>
            <p className="text-slate-600 font-medium">Tél: {schoolInfo.phone}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-black uppercase text-slate-800">Bilan Financier</h2>
          <p className="text-slate-500 font-medium mt-1">Généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}</p>
        </div>
      </div>

      {/* --- GRAPHIQUES DE TRÉSORERIE --- */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 print:border-slate-400">
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-600"/> Aperçu Global de la Trésorerie</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase mb-1">Total Encaissé</p>
            <p className="text-3xl font-black text-emerald-600">+{totalAllTimeIn.toLocaleString()} {currency}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase mb-1">Total Dépenses</p>
            <p className="text-3xl font-black text-red-600">-{totalAllTimeOut.toLocaleString()} {currency}</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase mb-1">Solde Net Actuel</p>
            <p className={`text-3xl font-black ${totalNet >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{totalNet.toLocaleString()} {currency}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-bold mb-1 text-emerald-700"><span>Encaissements</span><span>{percentIn.toFixed(1)}%</span></div>
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden"><div className="bg-emerald-500 h-4 rounded-full" style={{ width: `${percentIn}%` }}></div></div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-bold mb-1 text-red-700"><span>Dépenses</span><span>{percentOut.toFixed(1)}%</span></div>
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden"><div className="bg-red-500 h-4 rounded-full" style={{ width: `${percentOut}%` }}></div></div>
          </div>
        </div>
      </div>

      {/* --- FILTRES --- */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center print:hidden">
        <span className="text-sm font-bold text-slate-500 flex items-center gap-2 mr-2"><Search className="w-4 h-4"/> Filtrer les élèves :</span>
        <select value={filterLevel} onChange={(e) => { setFilterLevel(e.target.value); setFilterClass(""); setFilterOption(""); }} className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-semibold">
          <option value="">Tous les niveaux</option>
          {uniqueLevels.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setFilterOption(""); }} disabled={!filterLevel} className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-semibold disabled:opacity-50">
          <option value="">Toutes les classes</option>
          {uniqueClassNames.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
        <select value={filterOption} onChange={(e) => setFilterOption(e.target.value)} disabled={!filterLevel || filterLevel !== "Secondaire"} className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-semibold disabled:opacity-50">
          <option value="">Toutes les options</option>
          {availableOptions.map(opt => <option key={opt.id} value={opt.name}>{opt.name}</option>)}
        </select>
      </div>

      {/* --- STATS ÉLÈVES --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 print:border-slate-400">
          <div><p className="text-xs font-bold text-slate-500 uppercase">Total Élèves</p><p className="text-2xl font-black text-slate-800">{filteredStudents.length}</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm flex items-center gap-4 print:border-slate-400">
          <div><p className="text-xs font-bold text-emerald-600 uppercase">En règle</p><p className="text-2xl font-black text-emerald-600">{countPaid}</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-orange-200 shadow-sm flex items-center gap-4 print:border-slate-400">
          <div><p className="text-xs font-bold text-orange-600 uppercase">Partiels</p><p className="text-2xl font-black text-orange-600">{countPartial}</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm flex items-center gap-4 print:border-slate-400">
          <div><p className="text-xs font-bold text-red-600 uppercase">Impayés</p><p className="text-2xl font-black text-red-600">{countUnpaid}</p></div>
        </div>
      </div>

      {/* --- BILAN FINANCIER PAR PÉRIODE (AVEC L'ANNÉE) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-slate-400">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-800 text-sm print:bg-transparent">Aujourd'hui</div>
          <div className="p-5 space-y-3">
            <div className="flex justify-between items-center text-sm"><span className="text-slate-500">Encaissé</span><span className="font-bold text-emerald-600">+{statsToday.totalIn.toLocaleString()} {currency}</span></div>
            <div className="flex justify-between items-center text-sm"><span className="text-slate-500">Dépenses</span><span className="font-bold text-red-600">-{statsToday.totalOut.toLocaleString()} {currency}</span></div>
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center"><span className="font-bold text-slate-800">Net</span><span className={`font-black ${statsToday.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{statsToday.net.toLocaleString()} {currency}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-slate-400">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-800 text-sm print:bg-transparent">Cette Semaine</div>
          <div className="p-5 space-y-3">
            <div className="flex justify-between items-center text-sm"><span className="text-slate-500">Encaissé</span><span className="font-bold text-emerald-600">+{statsWeek.totalIn.toLocaleString()} {currency}</span></div>
            <div className="flex justify-between items-center text-sm"><span className="text-slate-500">Dépenses</span><span className="font-bold text-red-600">-{statsWeek.totalOut.toLocaleString()} {currency}</span></div>
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center"><span className="font-bold text-slate-800">Net</span><span className={`font-black ${statsWeek.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{statsWeek.net.toLocaleString()} {currency}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-slate-400">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-800 text-sm print:bg-transparent">Ce Mois</div>
          <div className="p-5 space-y-3">
            <div className="flex justify-between items-center text-sm"><span className="text-slate-500">Encaissé</span><span className="font-bold text-emerald-600">+{statsMonth.totalIn.toLocaleString()} {currency}</span></div>
            <div className="flex justify-between items-center text-sm"><span className="text-slate-500">Dépenses</span><span className="font-bold text-red-600">-{statsMonth.totalOut.toLocaleString()} {currency}</span></div>
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center"><span className="font-bold text-slate-800">Net</span><span className={`font-black ${statsMonth.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{statsMonth.net.toLocaleString()} {currency}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-slate-400">
          <div className="bg-blue-600 px-4 py-3 border-b border-blue-700 font-bold text-white text-sm print:bg-transparent print:text-slate-800 print:border-slate-200 flex items-center gap-2">
            <Calendar className="w-4 h-4"/> Cette Année
          </div>
          <div className="p-5 space-y-3">
            <div className="flex justify-between items-center text-sm"><span className="text-slate-500">Encaissé</span><span className="font-bold text-emerald-600">+{statsYear.totalIn.toLocaleString()} {currency}</span></div>
            <div className="flex justify-between items-center text-sm"><span className="text-slate-500">Dépenses</span><span className="font-bold text-red-600">-{statsYear.totalOut.toLocaleString()} {currency}</span></div>
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center"><span className="font-bold text-slate-800">Net</span><span className={`font-black text-xl ${statsYear.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{statsYear.net.toLocaleString()} {currency}</span></div>
          </div>
        </div>
      </div>

      {/* --- HISTORIQUE DES DÉPENSES --- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-slate-400">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 print:bg-transparent">
          <h2 className="font-bold text-slate-800">Registre des Dépenses</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-slate-400 uppercase border-b border-slate-100 print:border-slate-400">
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Motif</th>
                <th className="p-4 font-semibold">Bénéficiaire</th>
                <th className="p-4 font-semibold text-right">Montant</th>
                <th className="p-4 font-semibold text-center print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-200">
              {expenses.map(exp => (
                <tr key={exp.id}>
                  <td className="p-4 text-sm font-semibold text-slate-600">{new Date(exp.expense_date).toLocaleDateString('fr-FR')}</td>
                  <td className="p-4 font-bold text-slate-800">{exp.description}</td>
                  <td className="p-4 text-sm text-slate-600">{exp.recipient || "-"}</td>
                  <td className="p-4 text-right font-black text-red-600">-{Number(exp.amount).toLocaleString()} {currency}</td>
                  <td className="p-4 text-center print:hidden">
                    <button onClick={() => handleDeleteExpense(exp.id, exp.description, exp.amount)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500 italic">Aucune dépense enregistrée.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- SIGNATURES POUR L'IMPRESSION --- */}
      <div className="hidden print:flex justify-between px-16 mt-20 pt-8">
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800 uppercase mb-16">Le Comptable</p>
          <div className="w-56 border-b-2 border-slate-800"></div>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800 uppercase mb-16">Le Directeur / Promoteur</p>
          <div className="w-56 border-b-2 border-slate-800"></div>
        </div>
      </div>

      {/* --- MODAL DÉPENSE --- */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><TrendingDown className="w-5 h-5"/> Nouvelle Dépense</h2>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-white/80 hover:text-white bg-white/10 rounded-full p-1"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Motif de la dépense</label>
                <input required type="text" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Achat de craies" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bénéficiaire (À qui ?)</label>
                <input type="text" value={expenseForm.recipient} onChange={e => setExpenseForm({...expenseForm, recipient: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Fournisseur Papeterie" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Montant ({currency})</label>
                  <input required type="number" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input required type="date" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <button type="submit" disabled={savingExpense} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold mt-4 flex items-center justify-center gap-2 disabled:opacity-50">
                {savingExpense ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Enregistrer la dépense
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}