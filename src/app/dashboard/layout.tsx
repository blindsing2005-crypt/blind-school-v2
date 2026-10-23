"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  LayoutDashboard, Users, Wallet, GraduationCap, 
  Calendar, Settings, LogOut, Search, X, Loader2, CheckCircle2, 
  TrendingUp, CreditCard, ShieldCheck, HelpCircle, Info, User, Phone, Printer, Check, RefreshCcw, AlertTriangle, Lock, Mail, MessageCircle
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>({ school_name: "Mon École", school_logo_url: "", address: "" });
  
  // Rôles, Permissions et Abonnement
  const [userRole, setUserRole] = useState("Administrateur");
  const [username, setUsername] = useState("Administrateur");
  const [permissions, setPermissions] = useState<any>({ 
    dashboard: true, students: true, re_enrollment: true, 
    finance: true, reports: true, staff: true, life: true 
  });
  const [subscription, setSubscription] = useState<any>(null);
  
  // ID réel de l'école
  const [actualSchoolId, setActualSchoolId] = useState<string>("");
  
  // Recherche
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Fiche rapide et Paiement
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentBalance, setStudentBalance] = useState({ totalDue: 0, totalPaid: 0, balance: 0, status: "Inconnu" });
  const [fees, setFees] = useState<any[]>([]);
  const [studentPayments, setStudentPayments] = useState<any[]>([]);
  const [activeYear, setActiveYear] = useState<any>(null);

  // Processus de paiement
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [selectedFeeToPay, setSelectedFeeToPay] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/login");
      setUser(session.user);
      
      // 1. Récupérer le profil
      const { data: userProfile } = await supabase
        .from("school_users")
        .select("role, username, permissions, school_id")
        .eq("email", session.user.email)
        .maybeSingle();

      let currentSchoolId = session.user.id;

      if (userProfile) {
        setUserRole(userProfile.role);
        setUsername(userProfile.username || "Utilisateur");
        if (userProfile.permissions) setPermissions(userProfile.permissions);
        currentSchoolId = userProfile.school_id;
      } else {
        // Admin principal
        setUserRole("Administrateur");
        setUsername("Administrateur");
        setPermissions({ dashboard: true, students: true, re_enrollment: true, finance: true, reports: true, staff: true, life: true });
      }
      
      setActualSchoolId(currentSchoolId);

      // 2. Infos École
      const { data: schoolData } = await supabase.from("school_settings").select("*").eq("school_id", currentSchoolId).single();
      if (schoolData) setSchoolInfo(schoolData);
      
      // 3. Frais
      const { data: feesData } = await supabase.from("fees").select("*").eq("school_id", currentSchoolId);
      if (feesData) setFees(feesData);

      // 4. Année active
      const { data: yearsData } = await supabase.from("academic_years").select("*").eq("school_id", currentSchoolId).eq("is_active", true);
      if (yearsData && yearsData.length > 0) setActiveYear(yearsData[0]);

      // 5. Abonnement
      const { data: subData } = await supabase.from("subscriptions").select("*").eq("school_id", currentSchoolId).maybeSingle();
      if (subData) setSubscription(subData);
    };
    getUser();
  }, [router]);

  // --- ✅ RECHARGER LES ÉLÈVES À CHAQUE OUVERTURE DE LA RECHERCHE ---
  useEffect(() => {
    if (isSearchOpen && actualSchoolId) {
      const fetchLatestStudents = async () => {
        const { data } = await supabase
          .from("students")
          .select("*")
          .eq("school_id", actualSchoolId);
        if (data) setAllStudents(data);
      };
      fetchLatestStudents();
    }
  }, [isSearchOpen, actualSchoolId]);

  // --- RECHERCHE LOCALE (Instantanée et fiable) ---
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results = allStudents.filter(s => {
      const name = (s.full_name || `${s.first_name || ''} ${s.last_name || ''}`).toLowerCase();
      const matricule = (s.matricule || "").toLowerCase();
      return name.includes(q) || matricule.includes(q);
    }).slice(0, 5);
    setSearchResults(results);
  }, [searchQuery, allStudents]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const getStudentName = (student: any) => {
    if (!student) return "";
    return student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || "Élève inconnu";
  };

  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setShowPaymentFlow(false);
    setSelectedFeeToPay(null);
    setReceiptData(null);
    setIsSearching(true);
    
    const { data: paymentsData } = await supabase.from("payments").select("*").eq("student_id", student.id);
    setStudentPayments(paymentsData || []);

    const studentFees = fees.filter(f => {
      if (f.level !== student.level) return false;
      if (f.option && f.option !== student.option) return false;
      return true;
    });

    const totalDue = studentFees.reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const totalPaid = (paymentsData || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const balance = totalDue - totalPaid;

    let status = "Non payé";
    if (totalPaid >= totalDue && totalDue > 0) status = "En ordre";
    else if (totalPaid > 0 && balance > 0) status = "Partiel";

    setStudentBalance({ totalDue, totalPaid, balance, status });
    setIsSearching(false);
  };

  const getStudentFees = () => {
    if (!selectedStudent) return [];
    return fees.filter(f => {
      if (f.level !== selectedStudent.level) return false;
      if (f.option && f.option !== selectedStudent.option) return false;
      return true;
    });
  };

  const getPaidAmountForFee = (feeId: string) => {
    return studentPayments.filter(p => p.fee_id === feeId).reduce((sum, p) => sum + Number(p.amount), 0);
  };

  const initiatePaymentForFee = (fee: any) => {
    setSelectedFeeToPay(fee);
    const alreadyPaid = getPaidAmountForFee(fee.id);
    const remaining = Number(fee.amount) - alreadyPaid;
    setPaymentAmount(remaining.toString());
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeeToPay || !selectedStudent) return;
    setSavingPayment(true);
    
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
      // Log
      await supabase.from("activity_logs").insert([{
        school_id: actualSchoolId,
        user_name: `${username} (${userRole})`,
        action: "Paiement",
        details: `A encaissé ${Number(paymentAmount).toLocaleString()} FC pour ${getStudentName(selectedStudent)} (${selectedFeeToPay.name})`
      }]);

      const updatedPayments = [...studentPayments, data[0]];
      setStudentPayments(updatedPayments);
      
      const newTotalPaid = studentBalance.totalPaid + Number(paymentAmount);
      const newBalance = studentBalance.totalDue - newTotalPaid;
      
      let newStatus = "Non payé";
      if (newTotalPaid >= studentBalance.totalDue && studentBalance.totalDue > 0) newStatus = "En ordre";
      else if (newTotalPaid > 0 && newBalance > 0) newStatus = "Partiel";

      setStudentBalance(prev => ({
        ...prev,
        totalPaid: newTotalPaid,
        balance: newBalance,
        status: newStatus
      }));

      setSelectedFeeToPay(null);
      setShowPaymentFlow(false);
      setReceiptData(data[0]);
    } else {
      alert("Erreur : " + error?.message);
    }
    setSavingPayment(false);
  };

  // --- MENUS ---
  const allNavItems = [
    { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, color: "text-blue-600", bg: "bg-blue-100", permKey: "dashboard" },
    { name: "Élèves & Inscriptions", href: "/dashboard/students", icon: Users, color: "text-indigo-600", bg: "bg-indigo-100", permKey: "students" },
    { name: "Réinscriptions", href: "/dashboard/re-enrollment", icon: RefreshCcw, color: "text-purple-600", bg: "bg-purple-100", permKey: "re_enrollment" },
    { name: "Paiements & Minerval", href: "/dashboard/finance", icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-100", permKey: "finance" },
    { name: "Rapports financiers", href: "/dashboard/reports", icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-100", permKey: "reports" },
    { name: "Personnel & Enseignants", href: "/dashboard/staff", icon: GraduationCap, color: "text-orange-600", bg: "bg-orange-100", permKey: "staff" },
    { name: "Vie scolaire", href: "/dashboard/life", icon: Calendar, color: "text-teal-600", bg: "bg-teal-100", permKey: "life" },
  ];

  const mainNavItems = allNavItems.filter(item => permissions[item.permKey]);

  const systemNavItems = userRole === "Administrateur" ? [
    { name: "Configuration", href: "/dashboard/settings", icon: Settings, color: "text-slate-600", bg: "bg-slate-200" },
    { name: "Utilisateurs & Rôles", href: "/dashboard/users", icon: ShieldCheck, color: "text-cyan-600", bg: "bg-cyan-100" },
    { name: "Abonnement & Licence", href: "/dashboard/subscription", icon: CreditCard, color: "text-rose-600", bg: "bg-rose-100" },
  ] : [];

  // Calcul statut abonnement
  const isExpired = subscription && (subscription.status === 'Suspendu' || new Date(subscription.end_date) < new Date());
  const daysLeft = subscription ? Math.ceil((new Date(subscription.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="relative w-10 h-10 shrink-0">
            {schoolInfo.school_logo_url ? (
              <img src={schoolInfo.school_logo_url} alt="Logo" className="w-full h-full object-contain rounded-lg" />
            ) : (
              <Image src="/logo.png" alt="Logo" fill sizes="40px" className="object-contain" />
            )}
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-slate-800 leading-tight truncate">{schoolInfo.school_name}</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">BLIND SCHOOL</p>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Scolarité</p>
          <nav className="space-y-1.5 mb-8">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all group ${isActive ? 'bg-slate-50 shadow-sm border border-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'}`}>
                  <div className={`p-1.5 rounded-lg transition-transform group-hover:scale-110 ${item.bg}`}><item.icon className={`w-5 h-5 ${item.color}`} /></div>
                  <span className={isActive ? 'font-bold' : ''}>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {systemNavItems.length > 0 && (
            <>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Système</p>
              <nav className="space-y-1.5">
                {systemNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all group ${isActive ? 'bg-slate-50 shadow-sm border border-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'}`}>
                      <div className={`p-1.5 rounded-lg transition-transform group-hover:scale-110 ${item.bg}`}><item.icon className={`w-5 h-5 ${item.color}`} /></div>
                      <span className={isActive ? 'font-bold' : ''}>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 space-y-1">
          <Link href="/dashboard/guide" className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-slate-500 hover:bg-slate-50 font-medium transition-colors"><HelpCircle className="w-4 h-4" /> Guide</Link>
          <Link href="/dashboard/about" className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-slate-500 hover:bg-slate-50 font-medium transition-colors"><Info className="w-4 h-4" /> À propos</Link>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-red-600 hover:bg-red-50 font-medium transition-colors mt-2">
            <div className="p-1 rounded-lg bg-red-100"><LogOut className="w-4 h-4 text-red-600" /></div> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 flex flex-col relative">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800">{schoolInfo.school_name}</h2>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => setIsSearchOpen(true)} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-500 px-4 py-2 rounded-xl transition-colors w-64">
              <Search className="w-4 h-4" />
              <span className="text-sm">Rechercher (Élèves...)</span>
            </button>

            <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
              <div className="bg-blue-100 text-blue-700 w-10 h-10 rounded-full flex items-center justify-center font-bold uppercase">
                {username.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{username}</p>
                <p className="text-xs text-slate-500">{userRole}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto relative">
          
          {/* ✅ BANNIÈRE D'ALERTE (3 JOURS) */}
          {subscription && !isExpired && daysLeft <= 3 && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3 animate-pulse">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
              <div>
                <h3 className="font-bold text-red-800">Attention : Expiration imminente !</h3>
                <p className="text-sm text-red-700 mt-1">Votre abonnement expire dans <strong>{daysLeft} jour(s)</strong>. Allez dans "Abonnement & Licence" pour contacter l'administrateur et éviter le blocage.</p>
              </div>
            </div>
          )}

          {/* ✅ ÉCRAN DE BLOCAGE SI EXPIRÉ */}
          {isExpired && (
            <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center rounded-tl-2xl">
              <div className="bg-red-500/20 p-6 rounded-full mb-6">
                <Lock className="w-16 h-16 text-red-500" />
              </div>
              <h2 className="text-3xl font-black text-white mb-4">Application Bloquée</h2>
              <p className="text-slate-300 max-w-md mb-8">
                Votre abonnement a expiré ou votre compte a été suspendu. <br/>
                <strong className="text-emerald-400">Vos données sont précieusement conservées.</strong> Veuillez contacter l'administrateur pour renouveler votre accès.
              </p>
              <div className="flex flex-col gap-3 w-full max-w-sm">
                <a href="https://wa.me/243853929022" target="_blank" rel="noopener noreferrer" className="bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors">
                  <MessageCircle className="w-5 h-5" /> WhatsApp (+243 853 929 022)
                </a>
                <a href="https://wa.me/243997189141" target="_blank" rel="noopener noreferrer" className="bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors">
                  <MessageCircle className="w-5 h-5" /> WhatsApp (+243 997 189 141)
                </a>
                <a href="mailto:blindsing2005@gmail.com" className="bg-white text-slate-900 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors">
                  <Mail className="w-5 h-5" /> blindsing2005@gmail.com
                </a>
              </div>
            </div>
          )}

          {/* CONTENU (Flouté si bloqué) */}
          <div className={isExpired ? "opacity-10 pointer-events-none select-none blur-sm" : ""}>
            {children}
          </div>

        </div>
      </main>

      {/* MODAL DE RECHERCHE GLOBALE AVEC GESTION PAIEMENT */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-start justify-center pt-24 z-[60]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="flex items-center px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <Search className="w-6 h-6 text-slate-400 mr-3" />
              <input 
                autoFocus type="text" placeholder="Rechercher un élève..." 
                value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setSelectedStudent(null); setShowPaymentFlow(false); setReceiptData(null); }}
                className="flex-1 text-lg outline-none bg-transparent text-slate-900 placeholder:text-slate-400"
              />
              <button onClick={() => setIsSearchOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <div className="overflow-y-auto p-6 relative">
              
              {isSearching && searchResults.length === 0 && (
                <div className="py-10 text-center flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
                  <p className="text-slate-500 text-sm">Recherche en cours...</p>
                </div>
              )}

              {!isSearching && !selectedStudent && searchResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Résultats de recherche</p>
                  {searchResults.map(s => (
                    <div key={s.id} onClick={() => handleSelectStudent(s)} className="flex justify-between items-center p-4 bg-white border border-slate-100 hover:border-blue-300 hover:shadow-md rounded-xl cursor-pointer transition-all">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><User className="w-5 h-5"/></div>
                        <div>
                          <p className="font-bold text-slate-800">{getStudentName(s)}</p>
                          <p className="text-xs text-slate-500">{s.matricule} | {s.level} - {s.class_name}</p>
                        </div>
                      </div>
                      <button className="text-xs font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">Détails</button>
                    </div>
                  ))}
                </div>
              )}

              {!isSearching && !selectedStudent && searchResults.length === 0 && searchQuery.length >= 2 && (
                <div className="py-10 text-center">
                  <p className="text-slate-500 text-sm">Aucun élève trouvé pour "{searchQuery}".</p>
                </div>
              )}

              {selectedStudent && !isSearching && !receiptData && (
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">{getStudentName(selectedStudent)}</h3>
                      <p className="text-sm text-slate-500 font-mono mt-1">{selectedStudent.matricule || selectedStudent.id.substring(0,8)}</p>
                    </div>
                    <button onClick={() => { setSelectedStudent(null); setShowPaymentFlow(false); }} className="text-sm font-semibold text-slate-500 hover:text-slate-800 underline">
                      Retour
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500 font-bold uppercase mb-1">Classe actuelle</p>
                      <p className="font-bold text-slate-800">{selectedStudent.level} - {selectedStudent.class_name} {selectedStudent.option ? `(${selectedStudent.option})` : ""}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500 font-bold uppercase mb-1">Parent / Tuteur</p>
                      <p className="font-bold text-slate-800">{selectedStudent.parent_name || "-"}</p>
                      <p className="text-sm text-slate-500 flex items-center gap-1 mt-1"><Phone className="w-3 h-3"/> {selectedStudent.parent_phone || "-"}</p>
                    </div>
                  </div>

                  {permissions.finance ? (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 mb-6">
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-sm font-bold text-slate-800 uppercase">Situation Financière</p>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          studentBalance.status === "En ordre" ? 'bg-emerald-100 text-emerald-700' : 
                          studentBalance.status === 'Partiel' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                        }`}>{studentBalance.status}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div><p className="text-xs text-slate-500">Total Dû</p><p className="font-bold text-slate-800">{studentBalance.totalDue.toLocaleString()} FC</p></div>
                        <div><p className="text-xs text-slate-500">Déjà payé</p><p className="font-bold text-emerald-600">{studentBalance.totalPaid.toLocaleString()} FC</p></div>
                        <div><p className="text-xs text-slate-500">Solde</p><p className={`font-bold ${studentBalance.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{studentBalance.balance.toLocaleString()} FC</p></div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 mb-6 text-center">
                      <p className="text-sm text-slate-500 font-medium">Vous n'avez pas l'autorisation de voir les informations financières.</p>
                    </div>
                  )}

                  {!showPaymentFlow ? (
                    <div className="flex gap-3">
                      {permissions.finance && (
                        <button 
                          onClick={() => setShowPaymentFlow(true)} 
                          disabled={studentBalance.balance <= 0}
                          className={`flex-1 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg ${studentBalance.balance <= 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                        >
                          <Wallet className="w-5 h-5"/> {studentBalance.balance <= 0 ? "Entièrement payé" : "Effectuer un paiement"}
                        </button>
                      )}
                      <button 
                        onClick={() => { setIsSearchOpen(false); router.push('/dashboard/students'); }} 
                        className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                      >
                        <User className="w-5 h-5"/> Fiche complète
                      </button>
                    </div>
                  ) : (
                    <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
                      {!selectedFeeToPay ? (
                        <>
                          <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Choisissez une tranche à payer</h3>
                          <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
                            <table className="w-full text-left text-sm bg-white">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                  <th className="p-3">Tranche</th>
                                  <th className="p-3 text-right">Reste à payer</th>
                                  <th className="p-3 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {getStudentFees().map(fee => {
                                  const paid = getPaidAmountForFee(fee.id);
                                  const remaining = Number(fee.amount) - paid;
                                  return (
                                    <tr key={fee.id} className={remaining <= 0 ? "bg-emerald-50/50" : "bg-white"}>
                                      <td className="p-3 font-semibold text-slate-800">{fee.name}</td>
                                      <td className="p-3 text-right font-bold text-red-600">{remaining.toLocaleString()} FC</td>
                                      <td className="p-3 text-center">
                                        {remaining > 0 ? (
                                          <button onClick={() => initiatePaymentForFee(fee)} className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors">
                                            Payer
                                          </button>
                                        ) : (
                                          <span className="text-emerald-600 font-bold text-xs flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4"/> Payé</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <button onClick={() => setShowPaymentFlow(false)} className="text-slate-500 text-sm font-semibold hover:underline">Annuler le paiement</button>
                        </>
                      ) : (
                        <form onSubmit={handleSavePayment} className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm">
                          <div className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-100">
                            <p className="text-xs text-blue-600 font-bold uppercase mb-1">Paiement de la tranche</p>
                            <h3 className="font-bold text-slate-800 text-lg">{selectedFeeToPay.name}</h3>
                          </div>
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Montant reçu (FC)</label>
                            <input required type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 text-lg font-bold" />
                            <p className="text-xs text-slate-500 mt-2">Modifiable si l'élève paie une partie.</p>
                          </div>
                          <div className="flex gap-3">
                            <button type="button" onClick={() => setSelectedFeeToPay(null)} className="px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">Retour</button>
                            <button type="submit" disabled={savingPayment || Number(paymentAmount) <= 0} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                              {savingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Valider
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}

              {receiptData && (
                <div className="animate-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center mb-4 print:hidden">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold"><CheckCircle2 className="w-5 h-5" /> Paiement Enregistré</div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          document.body.classList.add('printing-receipt');
                          window.print();
                          setTimeout(() => document.body.classList.remove('printing-receipt'), 1000);
                        }} 
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        <Printer className="w-4 h-4" /> Imprimer
                      </button>
                      <button onClick={() => setReceiptData(null)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-slate-300">Fermer</button>
                    </div>
                  </div>
                  
                  <div className="bg-white p-8 md:p-14 text-slate-900 font-sans rounded-xl border border-slate-200 shadow-sm" id="receipt-print-area">
                    <div className="flex items-center justify-between border-b-2 border-slate-900 pb-6 mb-8">
                      <div className="flex items-center gap-6">
                        {schoolInfo.school_logo_url ? (
                          <img src={schoolInfo.school_logo_url} alt="Logo" className="w-24 h-24 object-contain" />
                        ) : (
                          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">Logo</div>
                        )}
                        <div>
                          <h1 className="text-xl font-bold uppercase tracking-wider text-slate-600">École</h1>
                          <h2 className="text-3xl font-black uppercase text-blue-900">{schoolInfo.school_name}</h2>
                          <p className="text-sm italic text-slate-500 mt-1">{schoolInfo.school_address}</p>
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
                            <th className="py-3 px-4 text-right font-bold w-40">Montant (FC)</th>
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
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}