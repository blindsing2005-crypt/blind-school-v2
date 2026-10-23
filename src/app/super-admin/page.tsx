"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Loader2, ShieldCheck, LogOut, Search, 
  Calendar, CheckCircle2, XCircle, Mail, Lock, 
  Plus, Minus, Edit2, Save
} from "lucide-react";

export default function SuperAdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  
  const [schools, setSchools] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pour l'édition manuelle de la date
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");

  // ⚠️ TON EMAIL SUPER ADMIN
  const SUPER_ADMIN_EMAIL = "blindsing2005@gmail.com"; 

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email === SUPER_ADMIN_EMAIL) {
        setIsAuthenticated(true);
        fetchSchools();
      } else {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const fetchSchools = async () => {
    const { data } = await supabase.from("subscriptions").select("*").order("created_at", { ascending: false });
    if (data) setSchools(data);
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError("");

    if (email !== SUPER_ADMIN_EMAIL) {
      setLoginError("Accès refusé. Vous n'êtes pas le propriétaire.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoginError("Mot de passe incorrect.");
      setLoading(false);
    } else {
      setIsAuthenticated(true);
      fetchSchools();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // --- AJUSTER LE TEMPS (+ ou - Jours) ---
  const adjustTime = async (id: string, currentEndDate: string, daysToAdd: number) => {
    let newEndDate = new Date(currentEndDate || new Date());
    newEndDate.setDate(newEndDate.getDate() + daysToAdd);
    
    // Si on ajoute du temps à un compte bloqué, on le réactive
    let newStatus = "Actif";
    
    const { error } = await supabase
      .from("subscriptions")
      .update({ end_date: newEndDate.toISOString().split('T')[0], status: newStatus })
      .eq("id", id);

    if (!error) fetchSchools();
    else alert("Erreur : " + error.message);
  };

  // --- SAUVEGARDER LA DATE MANUELLE ---
  const saveManualDate = async (id: string) => {
    if (!editDate) return;
    
    const { error } = await supabase
      .from("subscriptions")
      .update({ end_date: editDate, status: "Actif" })
      .eq("id", id);

    if (!error) {
      setEditingId(null);
      fetchSchools();
    } else {
      alert("Erreur : " + error.message);
    }
  };

  // --- SUSPENDRE / ACTIVER ---
  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Suspendu" ? "Actif" : "Suspendu";
    await supabase.from("subscriptions").update({ status: newStatus }).eq("id", id);
    fetchSchools();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  // --- LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700">
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Super Admin</h1>
            <p className="text-slate-400 text-sm mt-1">Espace privé de gestion des licences</p>
          </div>

          {loginError && <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-sm mb-4 text-center border border-red-500/20">{loginError}</div>}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-900 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500" placeholder="Email Super Admin" />
              </div>
            </div>
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-900 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500" placeholder="Mot de passe" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- DASHBOARD SUPER ADMIN ---
  const today = new Date();
  const filteredSchools = schools.filter(s => 
    s.school_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.owner_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 font-sans">
      
      <header className="bg-slate-800 border-b border-slate-700 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg"><ShieldCheck className="w-6 h-6 text-white" /></div>
          <div>
            <h1 className="text-xl font-bold text-white">Master Admin</h1>
            <p className="text-xs text-slate-400">Gestion des licences BLIND SCHOOL</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <LogOut className="w-5 h-5" /> Déconnexion
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-8 space-y-8">
        
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input type="text" placeholder="Rechercher une école..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-white w-full placeholder:text-slate-500" />
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                  <th className="p-4 font-semibold">Établissement</th>
                  <th className="p-4 font-semibold">Temps (Consommé / Restant)</th>
                  <th className="p-4 font-semibold">Date d'expiration</th>
                  <th className="p-4 font-semibold">Statut</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredSchools.map(school => {
                  const endDate = new Date(school.end_date);
                  const startDate = new Date(school.start_date);
                  
                  const isExpired = endDate < today || school.status === 'Suspendu';
                  
                  // Calculs de temps
                  const totalDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
                  const consumedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
                  const remainingDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

                  return (
                    <tr key={school.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-white">{school.school_name || "École"}</p>
                        <p className="text-xs text-slate-400">{school.owner_email}</p>
                      </td>
                      
                      <td className="p-4 text-sm">
                        <p className="text-slate-400">Total : <span className="text-white">{totalDuration > 0 ? totalDuration : 0} j</span></p>
                        <p className="text-emerald-400">Consommé : {consumedDays > 0 ? consumedDays : 0} j</p>
                        <p className={`font-bold ${remainingDays > 0 ? 'text-blue-400' : 'text-red-400'}`}>Restant : {remainingDays > 0 ? remainingDays : 0} j</p>
                      </td>
                      
                      <td className="p-4">
                        {editingId === school.id ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type="date" 
                              value={editDate} 
                              onChange={e => setEditDate(e.target.value)}
                              className="bg-slate-900 text-white px-2 py-1 rounded border border-slate-600 text-sm outline-none" 
                            />
                            <button onClick={() => saveManualDate(school.id)} className="bg-emerald-600 p-1.5 rounded text-white"><Save className="w-4 h-4" /></button>
                            <button onClick={() => setEditingId(null)} className="bg-slate-600 p-1.5 rounded text-white"><XCircle className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${isExpired ? 'text-red-400' : 'text-white'}`}>
                              {endDate.toLocaleDateString('fr-FR')}
                            </span>
                            <button onClick={() => { setEditingId(school.id); setEditDate(school.end_date); }} className="text-slate-500 hover:text-blue-400">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${isExpired ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                          {isExpired ? 'Bloqué' : 'Actif'}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {/* Boutons rapides d'ajout/retrait */}
                          <button onClick={() => adjustTime(school.id, school.end_date, -1)} className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-xs font-bold" title="Retirer 1 jour">-1j</button>
                          <button onClick={() => adjustTime(school.id, school.end_date, 1)} className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-xs font-bold" title="Ajouter 1 jour">+1j</button>
                          <button onClick={() => adjustTime(school.id, school.end_date, 30)} className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold" title="Ajouter 1 mois">+1m</button>
                          
                          <button 
                            onClick={() => toggleStatus(school.id, school.status)} 
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${school.status === 'Suspendu' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-500/20 hover:bg-red-500/40 text-red-400'}`}
                          >
                            {school.status === 'Suspendu' ? 'Débloquer' : 'Bloquer'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}