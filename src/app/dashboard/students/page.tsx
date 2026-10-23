"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  UserPlus, X, Loader2, Users, FileText, CheckCircle2, 
  Phone, MapPin, RefreshCw, Search, Check, AlertCircle, 
  UserMinus, Trash2, Wallet 
} from "lucide-react";

export default function StudentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [optionsList, setOptionsList] = useState<any[]>([]);
  const [activeYear, setActiveYear] = useState<any>(null);
  const [actualSchoolId, setActualSchoolId] = useState<string>("");
  const [username, setUsername] = useState("");
  const [userRole, setUserRole] = useState("");
  
  // Filtres
  const [filterLevel, setFilterLevel] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterOption, setFilterOption] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Modaux
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [selectedStudent, setSelectedStudent] = useState<any>(null); 
  const [studentPayments, setStudentPayments] = useState<any[]>([]);

  // Formulaire
  const [formData, setFormData] = useState({
    fullName: "", gender: "M", birthDate: "", birthPlace: "", previousSchool: "",
    parentName: "", parentPhone: "", parentAddress: "",
    level: "", classId: "", option: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      // ✅ Récupérer le vrai school_id et le nom
      const { data: userProfile } = await supabase.from("school_users").select("school_id, username, role").eq("email", user.email).maybeSingle();
      const schoolIdToUse = userProfile?.school_id || user.id;
      
      setActualSchoolId(schoolIdToUse);
      setUsername(userProfile?.username || "Administrateur");
      setUserRole(userProfile?.role || "Administrateur");

      const [classesRes, studentsRes, optionsRes, yearsRes] = await Promise.all([
        supabase.from("classes").select("*").eq("school_id", schoolIdToUse),
        supabase.from("students").select("*").eq("school_id", schoolIdToUse).order("created_at", { ascending: false }),
        supabase.from("options").select("*").eq("school_id", schoolIdToUse),
        supabase.from("academic_years").select("*").eq("school_id", schoolIdToUse).eq("is_active", true)
      ]);

      if (classesRes.data) setClasses(classesRes.data);
      if (studentsRes.data) setStudents(studentsRes.data);
      if (optionsRes.data) setOptionsList(optionsRes.data);
      if (yearsRes.data && yearsRes.data.length > 0) setActiveYear(yearsRes.data[0]);
      
      setLoading(false);
    };
    fetchData();
  }, [router]);

  // --- LOGIQUE DES FILTRES ---
  const levels = Array.from(new Set(classes.map(c => c.level)));
  const availableClassesForFilter = classes.filter(c => filterLevel === "" || c.level === filterLevel);
  
  const filteredStudents = students.filter(s => {
    if (s.academic_year !== activeYear?.name) return false;
    
    const matchLevel = filterLevel === "" || s.level === filterLevel;
    const matchClass = filterClass === "" || s.class_name === filterClass;
    const matchOption = filterOption === "" || s.option === filterOption;
    const matchStatus = filterStatus === "" || (filterStatus === "Actif" && s.status !== "Abandonné") || (filterStatus === "Abandonné" && s.status === "Abandonné");
    
    return matchLevel && matchClass && matchOption && matchStatus;
  });

  const stats = {
    total: filteredStudents.length,
    actifs: filteredStudents.filter(s => s.status !== "Abandonné").length,
    abandonnes: filteredStudents.filter(s => s.status === "Abandonné").length,
  };

  const availableClassesForForm = classes.filter(c => c.level === formData.level);
  
  const showOptionField = () => {
    if (formData.level !== "Secondaire") return false;
    const selectedClass = classes.find(c => c.id === formData.classId);
    if (!selectedClass) return false;
    if (selectedClass.name.includes("7ème") || selectedClass.name.includes("8ème")) return false;
    return true;
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeYear) return alert("Veuillez d'abord configurer une année scolaire active.");
    
    setSaving(true);
    const selectedClass = classes.find(c => c.id === formData.classId);
    const generatedMatricule = `BS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newStudent = {
      school_id: actualSchoolId, // ✅ Utilisation du bon ID
      class_id: formData.classId, 
      full_name: formData.fullName,
      gender: formData.gender, 
      birth_date: formData.birthDate || null,
      birth_place: formData.birthPlace,
      previous_school: formData.previousSchool,
      parent_name: formData.parentName,
      parent_phone: formData.parentPhone,
      parent_address: formData.parentAddress,
      status: "Actif",
      level: formData.level,
      class_name: selectedClass?.name, 
      option: showOptionField() ? formData.option : null,
      matricule: generatedMatricule, 
      academic_year: activeYear.name
    };

    const { data, error } = await supabase.from("students").insert([newStudent]).select();

    if (error) alert("Erreur : " + error.message);
    else if (data) {
      // ✅ Ajouter dans l'historique
      await supabase.from("activity_logs").insert([{
        school_id: actualSchoolId,
        user_name: `${username} (${userRole})`,
        action: "Inscription",
        details: `A inscrit l'élève ${formData.fullName} en ${formData.level} ${selectedClass?.name}`
      }]);

      setStudents([data[0], ...students]);
      setIsModalOpen(false);
      setFormData({ 
        fullName: "", gender: "M", birthDate: "", birthPlace: "", previousSchool: "",
        parentName: "", parentPhone: "", parentAddress: "",
        level: "", classId: "", option: "" 
      });
    }
    setSaving(false);
  };

  const handleToggleStatus = async (student: any) => {
    const newStatus = student.status === "Abandonné" ? "Actif" : "Abandonné";
    const { error } = await supabase.from("students").update({ status: newStatus }).eq("id", student.id);

    if (!error) {
      setStudents(students.map(s => s.id === student.id ? { ...s, status: newStatus } : s));
      setSelectedStudent({ ...student, status: newStatus });
      
      // ✅ Log
      await supabase.from("activity_logs").insert([{
        school_id: actualSchoolId,
        user_name: `${username} (${userRole})`,
        action: "Changement de statut",
        details: `A marqué ${student.full_name} comme ${newStatus}`
      }]);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("⚠️ Voulez-vous vraiment supprimer définitivement cet élève ?")) return;
    
    const student = students.find(s => s.id === id);
    const { error } = await supabase.from("students").delete().eq("id", id);
    
    if (!error) {
      setStudents(students.filter(s => s.id !== id));
      setSelectedStudent(null);

      // ✅ Log
      await supabase.from("activity_logs").insert([{
        school_id: actualSchoolId,
        user_name: `${username} (${userRole})`,
        action: "Suppression",
        details: `A supprimé l'élève ${student?.full_name}`
      }]);
    }
  };

  const openStudentProfile = async (student: any) => {
    setSelectedStudent(student);
    const { data } = await supabase.from("payments").select("*, fees ( name )").eq("student_id", student.id).order("created_at", { ascending: false });
    if (data) setStudentPayments(data);
    else setStudentPayments([]);
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* (Le reste du code de la page est identique à ce que tu as déjà) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Élèves & Inscriptions</h1>
          <p className="text-slate-500 text-sm">Année active : <span className="font-bold text-blue-600">{activeYear?.name || "Aucune"}</span></p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push('/dashboard/re-enrollment')} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-600" /> Réinscription
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-200">
            <UserPlus className="w-5 h-5" /> Nouvelle inscription
          </button>
        </div>
      </div>

      {!activeYear && (
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center gap-3 text-orange-800">
          <AlertCircle className="w-5 h-5" />
          <span className="font-bold">Attention :</span> Aucune année scolaire active. Allez dans Configuration.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="h-1 w-8 rounded-full bg-blue-500 mb-3"></div>
          <p className="text-sm font-semibold text-slate-500 mb-1">Total (filtré)</p>
          <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="h-1 w-8 rounded-full bg-emerald-500 mb-3"></div>
          <p className="text-sm font-semibold text-slate-500 mb-1">Actifs</p>
          <p className="text-3xl font-bold text-slate-800">{stats.actifs}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="h-1 w-8 rounded-full bg-red-500 mb-3"></div>
          <p className="text-sm font-semibold text-slate-500 mb-1">Abandonnés</p>
          <p className="text-3xl font-bold text-slate-800">{stats.abandonnes}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <select value={filterLevel} onChange={(e) => { setFilterLevel(e.target.value); setFilterClass(""); setFilterOption(""); }} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm min-w-[150px]">
          <option value="">Tous les niveaux</option>
          {levels.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        
        <select value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setFilterOption(""); }} disabled={!filterLevel} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm min-w-[150px] disabled:opacity-50">
          <option value="">Toutes les classes</option>
          {Array.from(new Set(availableClassesForFilter.map(c => c.name))).map(name => <option key={name} value={name}>{name}</option>)}
        </select>

        <select value={filterOption} onChange={(e) => setFilterOption(e.target.value)} disabled={filterLevel !== "Secondaire"} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm min-w-[150px] disabled:opacity-50">
          <option value="">Toutes les options</option>
          {optionsList.map(opt => <option key={opt.id} value={opt.name}>{opt.name}</option>)}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm min-w-[150px]">
          <option value="">Tous les statuts</option>
          <option value="Actif">Actif</option>
          <option value="Abandonné">Abandonné</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center">
            <Users className="w-16 h-16 mb-4 text-slate-300" />
            <p className="text-lg font-medium">Aucun élève trouvé pour ces critères.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 font-semibold">Matricule</th>
                  <th className="p-4 font-semibold">Nom Complet</th>
                  <th className="p-4 font-semibold">Classe / Option</th>
                  <th className="p-4 font-semibold">Statut</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm font-mono text-slate-600">{student.matricule}</td>
                    <td className="p-4 font-bold text-slate-800 uppercase">{student.full_name}</td>
                    <td className="p-4">
                      <span className="inline-block bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold">
                        {student.level} - {student.class_name}
                      </span>
                      {student.option && <p className="text-xs text-indigo-600 font-semibold mt-1">{student.option}</p>}
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        student.status === 'Abandonné' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {student.status || 'Actif'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => openStudentProfile(student)} className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors text-sm font-semibold flex items-center gap-1 ml-auto">
                        <FileText className="w-4 h-4" /> Fiche
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-slate-800 px-6 py-6 text-white relative">
              <button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 rounded-full p-1"><X className="w-5 h-5" /></button>
              <p className="text-slate-300 text-sm font-medium mb-1">Fiche Élève ({selectedStudent.academic_year})</p>
              <h2 className="text-2xl font-bold uppercase">{selectedStudent.full_name}</h2>
              <p className="text-slate-300 font-mono mt-2">{selectedStudent.matricule}</p>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-slate-500 uppercase font-semibold">Né(e) le</p><p className="text-slate-800 font-medium">{selectedStudent.birth_date || "-"}</p></div>
                <div><p className="text-xs text-slate-500 uppercase font-semibold">À</p><p className="text-slate-800 font-medium">{selectedStudent.birth_place || "-"}</p></div>
                <div><p className="text-xs text-slate-500 uppercase font-semibold">Classe</p><p className="text-slate-800 font-medium">{selectedStudent.level} - {selectedStudent.class_name}</p></div>
                <div><p className="text-xs text-slate-500 uppercase font-semibold">Option</p><p className="text-slate-800 font-medium">{selectedStudent.option || "-"}</p></div>
                <div><p className="text-xs text-slate-500 uppercase font-semibold">Genre</p><p className="text-slate-800 font-medium">{selectedStudent.gender === 'M' ? 'Masculin' : 'Féminin'}</p></div>
                <div><p className="text-xs text-slate-500 uppercase font-semibold">Statut actuel</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${selectedStudent.status === 'Abandonné' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {selectedStudent.status || 'Actif'}
                  </span>
                </div>
              </div>

              <hr className="border-slate-100" />
              
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">École de provenance</p>
                <p className="text-slate-800">{selectedStudent.previous_school || "Aucune (Nouveau)"}</p>
              </div>

              <hr className="border-slate-100" />

              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-3 flex items-center gap-1"><Phone className="w-3 h-3"/> Parent / Tuteur</p>
                <p className="text-slate-800 font-bold">{selectedStudent.parent_name || "-"}</p>
                <p className="text-slate-600 text-sm mt-1">{selectedStudent.parent_phone || "-"}</p>
                <p className="text-slate-600 text-sm mt-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> {selectedStudent.parent_address || "-"}</p>
              </div>

              <hr className="border-slate-100" />
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-2 flex items-center gap-1"><Wallet className="w-3 h-3"/> Historique des paiements</p>
                {studentPayments.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Aucun paiement effectué.</p>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                    {studentPayments.map(p => (
                      <div key={p.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 text-sm">
                        <div>
                          <p className="font-bold text-slate-800">{p.fees?.name || "Frais scolaires"}</p>
                          <p className="text-[10px] text-slate-500">{new Date(p.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <span className="font-bold text-emerald-600">+{Number(p.amount).toLocaleString()} FC</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <div className="flex gap-2">
                <button 
                  onClick={() => handleToggleStatus(selectedStudent)} 
                  className={`px-3 py-2 rounded-xl font-semibold text-sm flex items-center gap-1 transition-colors ${
                    selectedStudent.status === 'Abandonné' 
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  }`}
                >
                  {selectedStudent.status === 'Abandonné' ? <CheckCircle2 className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
                  {selectedStudent.status === 'Abandonné' ? 'Réactiver' : 'Abandonner'}
                </button>
                <button 
                  onClick={() => handleDeleteStudent(selectedStudent.id)} 
                  className="px-3 py-2 rounded-xl font-semibold text-sm flex items-center gap-1 transition-colors bg-red-100 text-red-700 hover:bg-red-200"
                >
                  <Trash2 className="w-4 h-4" /> Supprimer
                </button>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">Nouvelle Inscription ({activeYear?.name})</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white rounded-full p-1 shadow-sm"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddStudent} className="p-6 overflow-y-auto">
              
              <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> 1. Informations de l'élève
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom, Post-nom & Prénom</label>
                  <input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: NDOBOLA KABEYA Bel ange" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sexe</label>
                  <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date de naissance</label>
                  <input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lieu de naissance</label>
                  <input type="text" value={formData.birthPlace} onChange={e => setFormData({...formData, birthPlace: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Kinshasa" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">École de provenance</label>
                  <input type="text" value={formData.previousSchool} onChange={e => setFormData({...formData, previousSchool: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nom de l'ancienne école" />
                </div>
              </div>

              <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                <Users className="w-4 h-4" /> 2. Parent / Tuteur
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet</label>
                  <input type="text" value={formData.parentName} onChange={e => setFormData({...formData, parentName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                  <input type="text" value={formData.parentPhone} onChange={e => setFormData({...formData, parentPhone: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
                  <input type="text" value={formData.parentAddress} onChange={e => setFormData({...formData, parentAddress: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                <CheckCircle2 className="w-4 h-4" /> 3. Affectation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Niveau</label>
                  <select required value={formData.level} onChange={e => setFormData({...formData, level: e.target.value, classId: "", option: ""})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Choisir...</option>
                    {levels.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Classe</label>
                  <select required value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value, option: ""})} disabled={!formData.level} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100">
                    <option value="">Choisir...</option>
                    {availableClassesForForm.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {showOptionField() && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Option</label>
                    <select required value={formData.option} onChange={e => setFormData({...formData, option: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Choisir...</option>
                      {optionsList.map(opt => <option key={opt.id} value={opt.name}>{opt.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100">Annuler</button>
                <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 disabled:opacity-50">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Enregistrer l'élève
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}