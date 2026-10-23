"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  Loader2, Users, GraduationCap, Wallet, TrendingUp, 
  ArrowRight, Receipt, Clock, History
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ students: 0, staff: 0 });
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [currency, setCurrency] = useState("FC");
  const [username, setUsername] = useState("Administrateur");
  
  // ✅ Sécurité : on commence par refuser l'accès financier
  const [permissions, setPermissions] = useState<any>({ dashboard: true, finance: false });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: userProfile } = await supabase.from("school_users").select("username, permissions, school_id").eq("email", user.email).maybeSingle();
      
      let currentSchoolId = user.id;
      let userPerms: any = { dashboard: true, finance: false };

      if (userProfile) {
        setUsername(userProfile.username || "Utilisateur");
        if (userProfile.permissions) userPerms = userProfile.permissions;
        currentSchoolId = userProfile.school_id;
      } else {
        // C'est l'admin principal, il a TOUS les droits
        setUsername("Administrateur");
        userPerms = { dashboard: true, students: true, re_enrollment: true, finance: true, reports: true, staff: true, life: true };
      }
      
      setPermissions(userPerms);

      // Si l'utilisateur n'a même pas le droit au dashboard, on le déconnecte
      if (!userPerms.dashboard) {
        router.push("/login");
        return;
      }

      const { count: studentCount } = await supabase.from("students").select("*", { count: 'exact', head: true }).eq("school_id", currentSchoolId);
      const { count: staffCount } = await supabase.from("staff").select("*", { count: 'exact', head: true }).eq("school_id", currentSchoolId);

      const { data: payments } = await supabase.from("payments")
        .select(`*, students ( first_name, last_name, full_name )`)
        .eq("school_id", currentSchoolId)
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: logs } = await supabase.from("activity_logs")
        .select("*")
        .eq("school_id", currentSchoolId)
        .order("created_at", { ascending: false })
        .limit(10);
      
      const { data: school } = await supabase.from("school_settings").select("currency").eq("school_id", currentSchoolId).single();

      setStats({ students: studentCount || 0, staff: staffCount || 0 });
      
      // On ne charge les paiements que si on a la permission
      if (userPerms.finance && payments) {
        setRecentPayments(payments);
      }
      
      if (logs) setActivityLogs(logs);
      if (school?.currency) setCurrency(school.currency);

      setLoading(false);
    };
    fetchData();
  }, [router]);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  // Variable simplifiée pour le rendu
  const canSeeFinance = permissions.finance === true;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Message de Bienvenue */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Bonjour, {username} 👋</h1>
          <p className="text-blue-100">Bienvenue sur votre espace de gestion.</p>
        </div>
        <div className="absolute right-0 top-0 opacity-10">
          <GraduationCap className="w-64 h-64 -mt-10 -mr-10" />
        </div>
      </div>

      {/* Cartes Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/students" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-100 p-4 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform"><Users className="w-8 h-8" /></div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase">Total Élèves</p>
              <p className="text-3xl font-black text-slate-800">{stats.students}</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/staff" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 p-4 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform"><GraduationCap className="w-8 h-8" /></div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase">Personnel</p>
              <p className="text-3xl font-black text-slate-800">{stats.staff}</p>
            </div>
          </div>
        </Link>

        {/* ✅ SÉCURITÉ : On affiche la carte financière SEULEMENT si canSeeFinance est vrai */}
        {canSeeFinance && (
          <Link href="/dashboard/finance" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-4 rounded-xl text-orange-600 group-hover:scale-110 transition-transform"><Wallet className="w-8 h-8" /></div>
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase">Aller à la caisse</p>
                <p className="text-lg font-bold text-blue-600 mt-1">Paiements & Reçus <ArrowRight className="w-4 h-4 inline" /></p>
              </div>
            </div>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Derniers paiements */}
        {canSeeFinance ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2"><Receipt className="w-5 h-5 text-slate-500"/> Derniers Paiements</h2>
              <Link href="/dashboard/finance" className="text-sm font-semibold text-blue-600 hover:underline">Tout voir</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recentPayments.map(p => (
                <div key={p.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <p className="font-bold text-slate-800">{p.students?.full_name || `${p.students?.first_name} ${p.students?.last_name}`}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Clock className="w-3 h-3"/> {new Date(p.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <span className="font-black text-emerald-600">+{Number(p.amount).toLocaleString()} {currency}</span>
                </div>
              ))}
              {recentPayments.length === 0 && <p className="p-6 text-center text-slate-500 italic">Aucun paiement récent.</p>}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center text-center">
            <div className="bg-slate-100 p-4 rounded-full text-slate-400 mb-4"><Receipt className="w-10 h-10" /></div>
            <h2 className="text-lg font-bold text-slate-700">Espace Paiements</h2>
            <p className="text-slate-500 text-sm mt-1">Vous n'avez pas l'autorisation de consulter les paiements.</p>
          </div>
        )}

        {/* Accès Rapide aux Rapports */}
        {canSeeFinance ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-center items-center text-center space-y-4">
            <div className="bg-blue-50 p-4 rounded-full text-blue-600"><TrendingUp className="w-10 h-10" /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Analyser vos finances</h2>
              <p className="text-slate-500 text-sm mt-1 max-w-sm">Consultez vos bilans, gérez vos dépenses et imprimez vos rapports détaillés.</p>
            </div>
            <Link href="/dashboard/reports" className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold transition-colors">
              Ouvrir les Rapports Financiers
            </Link>
          </div>
        ) : (
          <div className="bg-blue-50 rounded-2xl border border-blue-100 shadow-sm p-6 flex flex-col justify-center items-center text-center space-y-4">
            <div className="bg-white p-4 rounded-full text-blue-600 shadow-sm"><Users className="w-10 h-10" /></div>
            <div>
              <h2 className="text-lg font-bold text-blue-900">Gestion des Élèves</h2>
              <p className="text-blue-700 text-sm mt-1 max-w-sm">Accédez rapidement aux inscriptions, aux fiches élèves et aux réinscriptions.</p>
            </div>
            <Link href="/dashboard/students" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-colors shadow-sm">
              Voir les élèves
            </Link>
          </div>
        )}

      </div>

      {/* HISTORIQUE DES ACTIVITÉS (Journal de bord) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><History className="w-5 h-5 text-slate-500"/> Historique des Activités Récentes</h2>
        </div>
        <div className="p-6 space-y-4">
          {activityLogs.map((log) => (
            <div key={log.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5"></div>
                <div className="w-0.5 h-full bg-slate-100 my-1"></div>
              </div>
              <div className="pb-4">
                <p className="text-sm text-slate-800">
                  <span className="font-bold">{log.user_name}</span> a effectué : <span className="font-semibold text-blue-600">{log.action}</span>
                </p>
                <p className="text-sm text-slate-600 mt-1">{log.details}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(log.created_at).toLocaleString('fr-FR')}</p>
              </div>
            </div>
          ))}
          {activityLogs.length === 0 && <p className="text-center text-slate-500 italic py-4">Aucune activité enregistrée pour le moment.</p>}
        </div>
      </div>

    </div>
  );
}