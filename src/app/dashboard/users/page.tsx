"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Loader2, Trash2, UserPlus, X, CheckCircle2, Settings, Eye, EyeOff, ShieldCheck, Edit
} from "lucide-react";

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [users, setUsers] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  
  // Modaux et édition
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null); // null = Création, sinon = Édition
  
  // Formulaire
  const [formData, setFormData] = useState({ 
    username: "", 
    email: "", 
    password: "", 
    role: "Secrétaire",
    permissions: { 
      dashboard: true, 
      students: true, 
      re_enrollment: false, 
      finance: false, 
      reports: false, 
      staff: false, 
      life: true 
    }
  });

  const fetchUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    // On récupère l'admin
    const { data: adminSettings } = await supabase
      .from("school_users")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();
    
    const adminUser = {
      id: "admin",
      email: user.email,
      username: adminSettings?.username || "Administrateur Principal",
      role: "Administrateur",
      password: "********",
      permissions: { dashboard: true, students: true, re_enrollment: true, finance: true, reports: true, staff: true, life: true }
    };

    // On récupère le reste
    const { data } = await supabase
      .from("school_users")
      .select("*")
      .eq("school_id", user.id)
      .order("created_at", { ascending: false });

    setUsers([adminUser, ...(data || [])]);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [router]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ 
      username: "", email: "", password: "", role: "Secrétaire",
      permissions: { dashboard: true, students: true, re_enrollment: false, finance: false, reports: false, staff: false, life: true }
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: any) => {
    if (user.id === "admin") return alert("Vous ne pouvez pas modifier votre propre rôle ici.");
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: user.password || "", // On garde l'ancien mot de passe mais on ne le modifiera pas
      role: user.role,
      permissions: user.permissions || { dashboard: true, students: true, re_enrollment: false, finance: false, reports: false, staff: false, life: true }
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingUser) {
      // --- MODE ÉDITION ---
      const { error } = await supabase.from("school_users").update({
        username: formData.username,
        role: formData.role,
        permissions: formData.permissions
      }).eq("id", editingUser.id);

      if (!error) {
        setIsModalOpen(false);
        fetchUsers();
        alert("Accès mis à jour avec succès !");
      } else {
        alert("Erreur : " + error.message);
      }
    } else {
      // --- MODE CRÉATION ---
      const { error: authError } = await supabase.rpc('create_confirmed_user', {
        user_email: formData.email,
        user_password: formData.password
      });

      if (authError) {
        alert("Erreur de création : " + authError.message);
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("school_users").insert([{
        school_id: user.id,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        permissions: formData.permissions,
        status: "Actif"
      }]);

      if (!error) {
        setIsModalOpen(false);
        fetchUsers();
        alert("Compte créé avec succès !");
      } else {
        alert("Erreur d'enregistrement : " + error.message);
      }
    }
    setSaving(false);
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (id === "admin") return alert("Vous ne pouvez pas supprimer votre propre compte.");
    if (!confirm("Voulez-vous vraiment supprimer cet utilisateur ? Il ne pourra plus jamais se connecter avec cet email.")) return;
    
    // 1. Supprimer de la table de l'école
    await supabase.from("school_users").delete().eq("id", id);
    
    // 2. Supprimer TOUT de Supabase Auth (pour libérer l'email)
    await supabase.rpc('delete_user_by_email', { email_to_delete: email });
    
    setUsers(users.filter(u => u.id !== id));
    alert("Utilisateur supprimé définitivement. Vous pouvez réutiliser cet email.");
  };

  const togglePermission = (perm: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [perm]: !prev.permissions[perm] }
    }));
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Utilisateurs & Accès</h1>
          <p className="text-slate-500 text-sm">Gérez l'équipe et définissez ce que chacun peut voir.</p>
        </div>
        <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all">
          <UserPlus className="w-5 h-5" /> Ajouter un membre
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 font-semibold">Membre</th>
                <th className="p-4 font-semibold">Identifiants</th>
                <th className="p-4 font-semibold">Rôle</th>
                <th className="p-4 font-semibold">Modules Autorisés</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const perms = u.permissions || {};
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                          {u.username?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-800">{u.username}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-600">{u.email}</p>
                      <p className="text-xs text-slate-500 font-mono mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">
                        Mdp: {u.password}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        u.role === 'Administrateur' ? 'bg-indigo-100 text-indigo-700' : 
                        u.role === 'Comptable' ? 'bg-emerald-100 text-emerald-700' : 
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {perms.dashboard && <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">Dashboard</span>}
                        {perms.students && <span className="text-[10px] bg-indigo-50 px-2 py-0.5 rounded text-indigo-600 border border-indigo-100">Élèves</span>}
                        {perms.finance && <span className="text-[10px] bg-emerald-50 px-2 py-0.5 rounded text-emerald-600 border border-emerald-100">Paiements</span>}
                        {perms.staff && <span className="text-[10px] bg-orange-50 px-2 py-0.5 rounded text-orange-600 border border-orange-100">Personnel</span>}
                        {perms.life && <span className="text-[10px] bg-teal-50 px-2 py-0.5 rounded text-teal-600 border border-teal-100">Vie sco.</span>}
                      </div>
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      {u.id !== "admin" && (
                        <button onClick={() => openEditModal(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier les accès">
                          <Edit className="w-5 h-5" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteUser(u.id, u.email)} 
                        disabled={u.id === "admin"}
                        className={`p-2 rounded-lg transition-colors ${u.id === "admin" ? 'text-slate-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
                        title="Supprimer définitivement"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL AJOUT / ÉDITION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {editingUser ? <><Edit className="w-5 h-5"/> Modifier les accès</> : <><UserPlus className="w-5 h-5"/> Nouveau Membre</>}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white bg-white/10 rounded-full p-1"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom d'utilisateur</label>
                  <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Titre / Rôle</label>
                  <input required type="text" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adresse Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={!!editingUser} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500" />
                {editingUser && <p className="text-xs text-orange-500 mt-1">L'email ne peut pas être modifié.</p>}
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe de connexion</label>
                  <div className="relative">
                    <input required type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* CASES À COCHER */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mt-4">
                <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-600"/> Accès aux modules</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'dashboard', label: 'Tableau de bord' },
                    { key: 'students', label: 'Élèves & Inscriptions' },
                    { key: 're_enrollment', label: 'Réinscriptions' },
                    { key: 'finance', label: 'Paiements & Minerval' },
                    { key: 'reports', label: 'Rapports financiers' },
                    { key: 'staff', label: 'Personnel' },
                    { key: 'life', label: 'Vie scolaire' },
                  ].map(perm => (
                    <label key={perm.key} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-200/50 rounded">
                      <input 
                        type="checkbox" 
                        checked={(formData.permissions as any)[perm.key]} 
                        onChange={() => togglePermission(perm.key)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <span className="text-xs font-medium text-slate-700">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold mt-4 flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} 
                {editingUser ? "Enregistrer les modifications" : "Créer le compte et les accès"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}