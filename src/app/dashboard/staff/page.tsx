"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Loader2, Plus, Search, Trash2, User, Mail, Phone, 
  Briefcase, X, CheckCircle2, GraduationCap, 
  Camera, Eye, Ban, UserX, UserMinus, RefreshCcw
} from "lucide-react";

export default function StaffPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewStaff, setViewStaff] = useState<any>(null); // Pour voir la fiche complète
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Options
  const roles = ["Enseignant", "Directeur", "Préfet", "Comptable", "Secrétaire", "Surveillant", "Bibliothécaire", "Autre"];
  const contractTypes = ["CDI", "CDD", "Stage", "Consultant", "Temps partiel"];
  const diplomas = ["Doctorat", "Master", "Licence", "Graduat", "Diplôme d'État", "Certificat", "Autre"];
  const maritalStatuses = ["Célibataire", "Marié(e)", "Divorcé(e)", "Veuf(ve)"];
  const statusOptions = ["Actif", "Abandonné", "Décédé", "Remplacé"];

  // Données du formulaire
  const [formData, setFormData] = useState({
    last_name: "", postnom: "", first_name: "",
    gender: "Masculin", birth_date: "", birth_place: "", marital_status: "Célibataire",
    phone: "", email: "", address: "", emergency_contact: "",
    role: "Enseignant", hire_date: new Date().toISOString().split('T')[0], contract_type: "CDI",
    highest_diploma: "", specialty: "", status: "Actif", photo_url: ""
  });

  const fetchStaff = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const { data } = await supabase
      .from("staff")
      .select("*")
      .eq("school_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setStaffList(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, [router]);

  // --- CHANGEMENT DE STATUT DIRECT ---
  const handleStatusChange = async (id: string, newStatus: string) => {
    // Mise à jour optimiste de l'interface
    setStaffList(staffList.map(s => s.id === id ? { ...s, status: newStatus } : s));
    
    // Mise à jour dans Supabase
    await supabase.from("staff").update({ status: newStatus }).eq("id", id);
  };

  // --- UPLOAD PHOTO ---
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `staff-${user.id}-${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from('school-logos').upload(fileName, file);
    
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('school-logos').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, photo_url: publicUrl }));
    } else {
      alert("Erreur d'upload de la photo.");
    }
    setUploadingPhoto(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newStaff = {
      school_id: user.id,
      ...formData,
      birth_date: formData.birth_date || null,
      hire_date: formData.hire_date || null
    };

    const { error } = await supabase.from("staff").insert([newStaff]);

    if (!error) {
      setIsModalOpen(false);
      setFormData({
        last_name: "", postnom: "", first_name: "",
        gender: "Masculin", birth_date: "", birth_place: "", marital_status: "Célibataire",
        phone: "", email: "", address: "", emergency_contact: "",
        role: "Enseignant", hire_date: new Date().toISOString().split('T')[0], contract_type: "CDI",
        highest_diploma: "", specialty: "", status: "Actif", photo_url: ""
      });
      fetchStaff();
    } else {
      alert("Erreur : " + error.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce membre ?")) return;
    await supabase.from("staff").delete().eq("id", id);
    setStaffList(staffList.filter(s => s.id !== id));
  };

  const getSeniority = (hireDate: string) => {
    if (!hireDate) return "N/A";
    const start = new Date(hireDate);
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < start.getDate())) {
      years--; months += 12;
    }
    if (years > 0) return `${years} an${years > 1 ? 's' : ''}`;
    if (months > 0) return `${months} mois`;
    return "Nouveau";
  };

  const filteredStaff = staffList.filter(s => {
    const name = `${s.first_name} ${s.last_name} ${s.postnom || ''}`.toLowerCase();
    const role = s.role.toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || role.includes(q);
  });

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Personnel & Enseignants</h1>
          <p className="text-slate-500 text-sm">Dossiers du personnel de l'établissement</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all">
          <Plus className="w-5 h-5" /> Nouveau Dossier
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <input type="text" placeholder="Rechercher un nom ou un rôle..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 font-semibold">Membre</th>
                <th className="p-4 font-semibold">Fonction</th>
                <th className="p-4 font-semibold">Contact</th>
                <th className="p-4 font-semibold">Statut (Modifiable)</th>
                <th className="p-4 font-semibold">Ancienneté</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.map((staff) => (
                <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {staff.photo_url ? (
                        <img src={staff.photo_url} alt="Profil" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
                          {staff.first_name?.charAt(0)}{staff.last_name?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-800">{staff.last_name} {staff.postnom} {staff.first_name}</p>
                        <p className="text-xs text-slate-500">{staff.specialty || "Aucune spécialité"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4"><span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${staff.role === 'Enseignant' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{staff.role}</span></td>
                  <td className="p-4 text-sm text-slate-600 space-y-1">
                    {staff.phone && <p className="flex items-center gap-2"><Phone className="w-3 h-3" /> {staff.phone}</p>}
                  </td>
                  
                  {/* ✅ SELECTEUR DE STATUT DIRECT */}
                  <td className="p-4">
                    <select 
                      value={staff.status || "Actif"} 
                      onChange={(e) => handleStatusChange(staff.id, e.target.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold outline-none border cursor-pointer ${
                        staff.status === 'Actif' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        staff.status === 'Remplacé' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        staff.status === 'Abandonné' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </td>

                  <td className="p-4"><span className="text-sm font-semibold text-slate-700">{getSeniority(staff.hire_date)}</span></td>
                  
                  {/* ✅ BOUTONS D'ACTION */}
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => setViewStaff(staff)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Voir la fiche complète">
                      <Eye className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(staff.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Supprimer">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL : FICHE COMPLÈTE (LECTURE SEULE) --- */}
      {viewStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 overflow-hidden flex flex-col">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><User className="w-5 h-5"/> Dossier Complet</h2>
              <button onClick={() => setViewStaff(null)} className="text-white/80 hover:text-white bg-white/10 rounded-full p-1"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-8">
              {/* En-tête profil */}
              <div className="flex items-center gap-6 border-b border-slate-200 pb-6 mb-6">
                {viewStaff.photo_url ? (
                  <img src={viewStaff.photo_url} alt="Profil" className="w-24 h-24 rounded-2xl object-cover shadow-sm" />
                ) : (
                  <div className="w-24 h-24 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center font-black text-3xl shadow-sm">
                    {viewStaff.first_name?.charAt(0)}{viewStaff.last_name?.charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{viewStaff.last_name} {viewStaff.postnom} {viewStaff.first_name}</h2>
                  <div className="flex gap-2 mt-2">
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">{viewStaff.role}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      viewStaff.status === 'Actif' ? 'bg-emerald-100 text-emerald-700' : 
                      viewStaff.status === 'Remplacé' ? 'bg-blue-100 text-blue-700' :
                      viewStaff.status === 'Abandonné' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-700'
                    }`}>{viewStaff.status}</span>
                  </div>
                </div>
              </div>

              {/* Détails en grille */}
              <div className="space-y-6">
                {/* Section Identité */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-100 pb-1">Identité & Situation</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-slate-500 text-xs">Sexe</p><p className="font-semibold text-slate-800">{viewStaff.gender}</p></div>
                    <div><p className="text-slate-500 text-xs">État civil</p><p className="font-semibold text-slate-800">{viewStaff.marital_status}</p></div>
                    <div><p className="text-slate-500 text-xs">Date de naissance</p><p className="font-semibold text-slate-800">{viewStaff.birth_date ? new Date(viewStaff.birth_date).toLocaleDateString('fr-FR') : "-"}</p></div>
                    <div><p className="text-slate-500 text-xs">Lieu de naissance</p><p className="font-semibold text-slate-800">{viewStaff.birth_place || "-"}</p></div>
                  </div>
                </div>

                {/* Section Contact */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-100 pb-1">Coordonnées</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div><p className="text-slate-500 text-xs">Téléphone</p><p className="font-semibold text-slate-800">{viewStaff.phone || "-"}</p></div>
                    <div><p className="text-slate-500 text-xs">Email</p><p className="font-semibold text-slate-800">{viewStaff.email || "-"}</p></div>
                    <div><p className="text-slate-500 text-xs">Contact d'urgence</p><p className="font-semibold text-slate-800">{viewStaff.emergency_contact || "-"}</p></div>
                    <div className="col-span-2 md:col-span-3"><p className="text-slate-500 text-xs">Adresse</p><p className="font-semibold text-slate-800">{viewStaff.address || "-"}</p></div>
                  </div>
                </div>

                {/* Section Pro */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-100 pb-1">Informations Professionnelles</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-slate-500 text-xs">Date d'embauche</p><p className="font-semibold text-slate-800">{viewStaff.hire_date ? new Date(viewStaff.hire_date).toLocaleDateString('fr-FR') : "-"}</p></div>
                    <div><p className="text-slate-500 text-xs">Type de contrat</p><p className="font-semibold text-slate-800">{viewStaff.contract_type}</p></div>
                    <div><p className="text-slate-500 text-xs">Diplôme</p><p className="font-semibold text-slate-800">{viewStaff.highest_diploma || "-"}</p></div>
                    <div><p className="text-slate-500 text-xs">Spécialité</p><p className="font-semibold text-slate-800">{viewStaff.specialty || "-"}</p></div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-200 text-right">
                <button onClick={() => setViewStaff(null)} className="bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-700 transition-colors">Fermer la fiche</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- FORMULAIRE GÉANT (MODAL AJOUT) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-8 overflow-hidden flex flex-col">
            
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><User className="w-5 h-5"/> Nouveau Dossier</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white bg-white/10 rounded-full p-1"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-8">
              
              {/* IDENTITÉ */}
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Identité</h3>
                <div className="flex gap-8 items-start">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-28 h-28 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative">
                      {formData.photo_url ? <img src={formData.photo_url} alt="Photo" className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-slate-400" />}
                      {uploadingPhoto && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>}
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-200 transition-colors"><Camera className="w-3 h-3"/> Photo</button>
                  </div>

                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div><label className="block text-xs font-bold text-slate-600 mb-1">Nom *</label><input required type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div><label className="block text-xs font-bold text-slate-600 mb-1">Postnom</label><input type="text" value={formData.postnom} onChange={e => setFormData({...formData, postnom: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div><label className="block text-xs font-bold text-slate-600 mb-1">Prénom</label><input type="text" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div><label className="block text-xs font-bold text-slate-600 mb-1">Sexe</label><select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none bg-white"><option value="Masculin">Masculin</option><option value="Féminin">Féminin</option></select></div>
                    <div><label className="block text-xs font-bold text-slate-600 mb-1">Date de naissance</label><input type="date" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none" /></div>
                    <div><label className="block text-xs font-bold text-slate-600 mb-1">Lieu de naissance</label><input type="text" value={formData.birth_place} onChange={e => setFormData({...formData, birth_place: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none" /></div>
                    <div className="col-span-1"><label className="block text-xs font-bold text-slate-600 mb-1">État civil</label><select value={formData.marital_status} onChange={e => setFormData({...formData, marital_status: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none bg-white">{maritalStatuses.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                  </div>
                </div>
              </div>

              {/* COORDONNÉES */}
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Coordonnées</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-slate-600 mb-1">Téléphone</label><input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1">Email</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1">Adresse</label><input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1">Contact d'urgence</label><input type="text" value={formData.emergency_contact} onChange={e => setFormData({...formData, emergency_contact: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none" /></div>
                </div>
              </div>

              {/* INFOS PRO */}
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Informations Professionnelles</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-xs font-bold text-slate-600 mb-1">Rôle *</label><select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none bg-white">{roles.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1">Date d'embauche</label><input type="date" value={formData.hire_date} onChange={e => setFormData({...formData, hire_date: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none" /></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1">Type de contrat</label><select value={formData.contract_type} onChange={e => setFormData({...formData, contract_type: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none bg-white">{contractTypes.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1">Diplôme le plus élevé</label><select value={formData.highest_diploma} onChange={e => setFormData({...formData, highest_diploma: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none bg-white"><option value="">— Choisir —</option>{diplomas.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1">Spécialité</label><input type="text" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none" /></div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Statut initial</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none bg-white">
                      {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Annuler</button>
                <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50 shadow-md">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Enregistrer le dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}