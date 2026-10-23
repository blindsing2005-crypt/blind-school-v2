"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Plus, Trash2, Loader2, Calendar, School, 
  Wallet, Settings2, Save, Image as ImageIcon, BookOpen, Layers, Upload, CheckCircle2
} from "lucide-react";

const DEFAULT_LEVELS = ["Maternelle", "Primaire", "Secondaire"];
const DEFAULT_OPTIONS = [
  "Scientifique", "Littéraire", "Pédagogique", "Mécanique Auto", 
  "Mécanique Générale", "Électricité", "Commerciale & Gestion", 
  "Coupe & Couture", "Construction", "Informatique", "Électronique"
];

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("ecole"); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Données
  const [schoolInfo, setSchoolInfo] = useState({ name: "", address: "", phone: "", logo_url: "" });
  const [years, setYears] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);

  // Formulaires
  const [newYear, setNewYear] = useState({ name: "", start: "", end: "" });
  const [newLevel, setNewLevel] = useState("");
  const [newOption, setNewOption] = useState("");
  const [newClass, setNewClass] = useState({ level: "", name: "", option: "" });
  const [newFee, setNewFee] = useState({ name: "", level: "Maternelle", option: "", amount: 0 });

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    // 1. Paramètres de l'école
    const { data: s } = await supabase.from("school_settings").select("*").eq("school_id", user.id).single();
    if (s) setSchoolInfo({ name: s.school_name || "", address: s.school_address || "", phone: s.school_phone || "", logo_url: s.school_logo_url || "" });

    // 2. Années
    const { data: y } = await supabase.from("academic_years").select("*").eq("school_id", user.id).order("created_at", { ascending: false });
    if (y) setYears(y);

    // 3. Niveaux
    let { data: l } = await supabase.from("levels").select("*").eq("school_id", user.id).order("name");
    if (!l || l.length === 0) {
      const defaultLevels = DEFAULT_LEVELS.map(name => ({ school_id: user.id, name }));
      await supabase.from("levels").insert(defaultLevels);
      const { data: newL } = await supabase.from("levels").select("*").eq("school_id", user.id).order("name");
      l = newL;
    }
    setLevels(l || []);

    // 4. Options
    let { data: o } = await supabase.from("options").select("*").eq("school_id", user.id).order("name");
    if (!o || o.length === 0) {
      const defaultOptions = DEFAULT_OPTIONS.map(name => ({ school_id: user.id, name }));
      await supabase.from("options").insert(defaultOptions);
      const { data: newO } = await supabase.from("options").select("*").eq("school_id", user.id).order("name");
      o = newO;
    }
    setOptions(o || []);

    // 5. Classes
    const { data: c } = await supabase.from("classes").select("*").eq("school_id", user.id).order("name");
    if (c) setClasses(c);

    // 6. Frais
    const { data: f } = await supabase.from("fees").select("*").eq("school_id", user.id).order("created_at", { ascending: true });
    if (f) setFees(f);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- UPLOAD LOGO (SAUVEGARDE INSTANTANÉE) ---
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;

    // 1. Upload du fichier
    const { error: uploadError } = await supabase.storage.from('school-logos').upload(fileName, file);
    if (uploadError) { alert("Erreur d'upload: " + uploadError.message); setUploadingLogo(false); return; }

    // 2. Récupération du lien public
    const { data: { publicUrl } } = supabase.storage.from('school-logos').getPublicUrl(fileName);
    
    // 3. Sauvegarde immédiate dans la base de données
    await supabase.from("school_settings").upsert({
      school_id: user.id,
      school_logo_url: publicUrl,
    }, { onConflict: 'school_id' });

    setSchoolInfo({ ...schoolInfo, logo_url: publicUrl });
    setUploadingLogo(false);
    alert("Logo mis à jour avec succès !");
    window.location.reload(); // Recharger pour mettre à jour la sidebar
  };

  // --- SAUVEGARDE INFOS ECOLE ---
  const saveSchoolInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updates = {
      school_id: user.id,
      school_name: schoolInfo.name,
      school_address: schoolInfo.address,
      school_phone: schoolInfo.phone,
      school_logo_url: schoolInfo.logo_url,
    };

    const { error } = await supabase.from("school_settings").upsert(updates, { onConflict: 'school_id' });
    
    if (error) {
      alert("Erreur de sauvegarde : " + error.message);
    } else {
      window.location.reload(); 
    }
    setSaving(false);
  };

  // --- ANNEE ACTIVE ---
  const setActiveYear = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);

    await supabase.from("academic_years").update({ is_active: false }).eq("school_id", user.id);
    await supabase.from("academic_years").update({ is_active: true }).eq("id", id);

    fetchData(); 
    setSaving(false);
  };

  // --- AJOUTS DIVERS ---
  const addYear = async () => {
    if (!newYear.name) return;
    const { data: { user } } = await supabase.auth.getUser();
    const isFirst = years.length === 0;
    
    await supabase.from("academic_years").insert([{ 
      school_id: user?.id, name: newYear.name, start_date: newYear.start, end_date: newYear.end, is_active: isFirst 
    }]);
    setNewYear({ name: "", start: "", end: "" }); fetchData();
  };

  const addLevel = async () => {
    if (!newLevel) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("levels").insert([{ school_id: user?.id, name: newLevel }]);
    setNewLevel(""); fetchData();
  };

  const addOption = async () => {
    if (!newOption) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("options").insert([{ school_id: user?.id, name: newOption }]);
    setNewOption(""); fetchData();
  };

  const addFee = async () => {
    if (!newFee.name || !newFee.amount) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("fees").insert([{
      school_id: user?.id, name: newFee.name, level: newFee.level, 
      option: newFee.level === "Secondaire" && newFee.option !== "" ? newFee.option : null, 
      amount: newFee.amount
    }]);
    setNewFee({ name: "", level: "Maternelle", option: "", amount: 0 });
    fetchData();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-2">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Tableau de bord
        </Link>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Configuration</h2>
        {[
          { id: "ecole", icon: School, label: "Profil École" },
          { id: "annees", icon: Calendar, label: "Années Scolaires" },
          { id: "niveaux", icon: Layers, label: "Niveaux" },
          { id: "options", icon: BookOpen, label: "Options" },
          { id: "classes", icon: Settings2, label: "Classes" },
          { id: "minerval", icon: Wallet, label: "Frais & Tranches" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === tab.id ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"}`}>
            <tab.icon className="w-5 h-5" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-8 overflow-y-auto h-screen">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 p-8 min-h-[600px]">
          
          {activeTab === "ecole" && (
            <div className="animate-in fade-in">
              <h1 className="text-2xl font-bold text-slate-900 mb-6">Profil de l'École</h1>
              <form onSubmit={saveSchoolInfo} className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative">
                    {schoolInfo.logo_url ? <img src={schoolInfo.logo_url} alt="Logo" className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-slate-400" />}
                    {uploadingLogo && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>}
                  </div>
                  <div className="flex-1">
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors">
                      <Upload className="w-4 h-4" /> Choisir une image
                    </button>
                  </div>
                </div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'établissement</label><input type="text" value={schoolInfo.name} onChange={e => setSchoolInfo({...schoolInfo, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border font-bold" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label><input type="text" value={schoolInfo.address} onChange={e => setSchoolInfo({...schoolInfo, address: e.target.value})} className="w-full px-4 py-3 rounded-xl border" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label><input type="text" value={schoolInfo.phone} onChange={e => setSchoolInfo({...schoolInfo, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border" /></div>
                </div>
                <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Enregistrer
                </button>
              </form>
            </div>
          )}

          {activeTab === "annees" && (
            <div className="animate-in fade-in">
              <h1 className="text-2xl font-bold text-slate-900 mb-6">Années Scolaires</h1>
              <div className="flex gap-4 mb-8 bg-slate-50 p-4 rounded-2xl border items-end">
                <div className="flex-1"><label className="text-sm font-medium">Nom (ex: 2024-2025)</label><input value={newYear.name} onChange={e => setNewYear({...newYear, name: e.target.value})} className="w-full px-4 py-2 rounded-lg border mt-1" /></div>
                <div className="flex-1"><label className="text-sm font-medium">Début</label><input type="date" value={newYear.start} onChange={e => setNewYear({...newYear, start: e.target.value})} className="w-full px-4 py-2 rounded-lg border mt-1" /></div>
                <div className="flex-1"><label className="text-sm font-medium">Fin</label><input type="date" value={newYear.end} onChange={e => setNewYear({...newYear, end: e.target.value})} className="w-full px-4 py-2 rounded-lg border mt-1" /></div>
                <button onClick={addYear} className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold h-[42px]">Ajouter</button>
              </div>
              <div className="space-y-3">
                {years.map(y => (
                  <div key={y.id} className={`flex justify-between items-center p-4 border rounded-xl shadow-sm ${y.is_active ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                    <div>
                      <h3 className="font-bold flex items-center gap-2">
                        {y.name} 
                        {y.is_active && <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full">ACTIVE</span>}
                      </h3>
                      <p className="text-sm text-slate-500">Du {y.start_date} au {y.end_date}</p>
                    </div>
                    <div className="flex gap-2">
                      {!y.is_active && (
                        <button onClick={() => setActiveYear(y.id)} disabled={saving} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Activer
                        </button>
                      )}
                      <button onClick={async () => { if(confirm("Supprimer ?")) { await supabase.from("academic_years").delete().eq("id", y.id); fetchData(); } }} className="text-red-500 p-2"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "niveaux" && (
            <div className="animate-in fade-in">
              <h1 className="text-2xl font-bold text-slate-900 mb-6">Niveaux d'enseignement</h1>
              <div className="flex gap-4 mb-8 bg-slate-50 p-4 rounded-2xl border">
                <input value={newLevel} onChange={e => setNewLevel(e.target.value)} placeholder="Nouveau niveau" className="flex-1 px-4 py-2 rounded-lg border" />
                <button onClick={addLevel} className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold">Ajouter</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {levels.map(l => (
                  <div key={l.id} className="flex justify-between items-center p-4 border rounded-xl bg-white shadow-sm">
                    <span className="font-bold">{l.name}</span>
                    <button onClick={async () => { if(confirm("Supprimer ?")) { await supabase.from("levels").delete().eq("id", l.id); fetchData(); } }} className="text-red-500 p-2"><Trash2 className="w-5 h-5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "options" && (
            <div className="animate-in fade-in">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Options</h1>
              </div>
              <div className="flex gap-4 mb-8 bg-slate-50 p-4 rounded-2xl border">
                <input value={newOption} onChange={e => setNewOption(e.target.value)} placeholder="Nouvelle option" className="flex-1 px-4 py-2 rounded-lg border" />
                <button onClick={addOption} className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold">Ajouter</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {options.map(o => (
                  <div key={o.id} className="flex justify-between items-center p-4 border rounded-xl bg-white shadow-sm">
                    <span className="font-bold">{o.name}</span>
                    <button onClick={async () => { if(confirm("Supprimer ?")) { await supabase.from("options").delete().eq("id", o.id); fetchData(); } }} className="text-red-500 p-2"><Trash2 className="w-5 h-5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "classes" && (
            <div className="animate-in fade-in">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Gestion des Classes</h1>
              </div>
              <div className="flex gap-4 mb-8 bg-slate-50 p-4 rounded-2xl border items-end">
                <div className="flex-1"><label className="text-xs font-bold">Niveau</label><select value={newClass.level} onChange={e => setNewClass({...newClass, level: e.target.value})} className="w-full px-3 py-2 rounded-lg border mt-1">{levels.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</select></div>
                <div className="flex-1"><label className="text-xs font-bold">Nom (ex: 1ère A)</label><input value={newClass.name} onChange={e => setNewClass({...newClass, name: e.target.value})} className="w-full px-3 py-2 rounded-lg border mt-1" /></div>
                <div className="flex-1"><label className="text-xs font-bold">Option (facultatif)</label><select value={newClass.option} onChange={e => setNewClass({...newClass, option: e.target.value})} className="w-full px-3 py-2 rounded-lg border mt-1"><option value="">Aucune</option>{options.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}</select></div>
                <button onClick={async () => { 
                  if(!newClass.level || !newClass.name) return;
                  const { data: { user } } = await supabase.auth.getUser();
                  await supabase.from("classes").insert([{ school_id: user?.id, level: newClass.level, name: newClass.name, option: newClass.option || null }]);
                  setNewClass({ level: levels[0]?.name || "", name: "", option: "" }); fetchData();
                }} className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold h-[42px]">Ajouter</button>
              </div>
              <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
                {classes.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-3 border rounded-xl bg-white shadow-sm">
                    <div><span className="text-[10px] text-blue-600 font-bold uppercase">{c.level}</span><h3 className="font-bold text-sm">{c.name}</h3>{c.option && <p className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded">{c.option}</p>}</div>
                    <button onClick={async () => { if(confirm("Supprimer ?")) { await supabase.from("classes").delete().eq("id", c.id); fetchData(); } }} className="text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "minerval" && (
            <div className="animate-in fade-in">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Frais & Tranches</h1>
              <div className="bg-slate-50 p-4 rounded-2xl border mb-8 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]"><label className="text-xs font-bold">Nom du frais (ex: 1ère Tranche)</label><input value={newFee.name} onChange={e => setNewFee({...newFee, name: e.target.value})} className="w-full px-3 py-2 rounded-lg border mt-1" /></div>
                <div className="flex-1 min-w-[150px]"><label className="text-xs font-bold">Niveau</label><select value={newFee.level} onChange={e => setNewFee({...newFee, level: e.target.value})} className="w-full px-3 py-2 rounded-lg border mt-1">{DEFAULT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                {newFee.level === "Secondaire" && (
                  <div className="flex-1 min-w-[150px]"><label className="text-xs font-bold">Option</label><select value={newFee.option} onChange={e => setNewFee({...newFee, option: e.target.value})} className="w-full px-3 py-2 rounded-lg border mt-1"><option value="">Toutes les options</option>{options.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}</select></div>
                )}
                <div className="w-32"><label className="text-xs font-bold">Montant (FC)</label><input type="number" value={newFee.amount} onChange={e => setNewFee({...newFee, amount: Number(e.target.value)})} className="w-full px-3 py-2 rounded-lg border mt-1" /></div>
                <button onClick={addFee} className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold h-[42px]">Ajouter</button>
              </div>
              <div className="space-y-3">
                {fees.map(f => (
                  <div key={f.id} className="flex justify-between items-center p-4 border rounded-xl bg-white shadow-sm">
                    <div>
                      <span className="text-[10px] text-blue-600 font-bold uppercase">{f.level} {f.option ? `• ${f.option}` : ''}</span>
                      <h3 className="font-bold">{f.name}</h3>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="font-extrabold text-lg text-slate-800">{f.amount} FC</span>
                      <button onClick={async () => { if(confirm("Supprimer ?")) { await supabase.from("fees").delete().eq("id", f.id); fetchData(); } }} className="text-red-400 p-2"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}