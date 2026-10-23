"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Loader2, ArrowRight, CheckCircle2, User, Search, 
  HelpCircle, Check, RefreshCcw
} from "lucide-react";

export default function ReEnrollmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [years, setYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [actualSchoolId, setActualSchoolId] = useState("");
  const [username, setUsername] = useState("");
  const [userRole, setUserRole] = useState("");
  
  const [oldYear, setOldYear] = useState("");
  const [newYear, setNewYear] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selections, setSelections] = useState<Record<string, { selected: boolean, newClass: string, newOption: string }>>({});

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      // ✅ Récupérer l'ID de l'école
      const { data: userProfile } = await supabase.from("school_users").select("school_id, username, role").eq("email", user.email).maybeSingle();
      const schoolIdToUse = userProfile?.school_id || user.id;
      
      setActualSchoolId(schoolIdToUse);
      setUsername(userProfile?.username || "Administrateur");
      setUserRole(userProfile?.role || "Administrateur");

      const [yearsRes, classesRes, studentsRes] = await Promise.all([
        supabase.from("academic_years").select("*").eq("school_id", schoolIdToUse).order("name", { ascending: false }),
        supabase.from("classes").select("*").eq("school_id", schoolIdToUse).order("level").order("name"),
        supabase.from("students").select("*").eq("school_id", schoolIdToUse).order("last_name")
      ]);

      if (yearsRes.data) setYears(yearsRes.data);
      if (classesRes.data) setClasses(classesRes.data);
      if (studentsRes.data) setStudents(studentsRes.data);
      
      setLoading(false);
    };
    fetchData();
  }, [router]);

  const filteredStudents = students.filter(s => {
    const matchYear = oldYear === "" || s.academic_year === oldYear;
    const name = `${s.first_name || ''} ${s.last_name || ''} ${s.full_name || ''}`.toLowerCase();
    const matchSearch = name.includes(searchQuery.toLowerCase());
    return matchYear && matchSearch;
  });

  const toggleSelection = (student: any) => {
    setSelections(prev => ({
      ...prev,
      [student.id]: {
        ...prev[student.id],
        selected: !prev[student.id]?.selected,
        newClass: prev[student.id]?.newClass || "",
        newOption: prev[student.id]?.newOption || ""
      }
    }));
  };

  const handleClassChange = (studentId: string, newClassValue: string) => {
    const classObj = classes.find(c => c.name === newClassValue);
    setSelections(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        newClass: newClassValue,
        newOption: classObj?.option || ""
      }
    }));
  };

  const handleSelectAll = () => {
    const newSelections = { ...selections };
    filteredStudents.forEach(s => {
      newSelections[s.id] = { ...newSelections[s.id], selected: true };
    });
    setSelections(newSelections);
  };

  const handleSave = async () => {
    if (oldYear === newYear) return alert("L'année actuelle et la nouvelle année doivent être différentes.");
    if (!oldYear || !newYear) return alert("Veuillez sélectionner les deux années.");

    const studentsToEnroll = Object.keys(selections).filter(id => selections[id].selected);
    if (studentsToEnroll.length === 0) return alert("Veuillez sélectionner au moins un élève.");

    for (const id of studentsToEnroll) {
      if (!selections[id].newClass) {
        const student = students.find(s => s.id === id);
        return alert(`Veuillez attribuer une nouvelle classe à l'élève ${student?.first_name} ${student?.last_name}.`);
      }
    }

    setSaving(true);

    const newStudentsData = studentsToEnroll.map(id => {
      const student = students.find(s => s.id === id);
      return {
        school_id: actualSchoolId, // ✅ ID de l'école
        first_name: student.first_name,
        last_name: student.last_name,
        full_name: student.full_name,
        postnom: student.postnom,
        gender: student.gender,
        parent_name: student.parent_name,
        parent_phone: student.parent_phone,
        level: classes.find(c => c.name === selections[id].newClass)?.level || student.level,
        class_name: selections[id].newClass,
        option: selections[id].newOption || null,
        academic_year: newYear,
        matricule: student.matricule ? `${student.matricule}-R` : null
      };
    });

    const { error } = await supabase.from("students").insert(newStudentsData);

    if (!error) {
      // ✅ Log de l'action
      await supabase.from("activity_logs").insert([{
        school_id: actualSchoolId,
        user_name: `${username} (${userRole})`,
        action: "Réinscription",
        details: `A réinscrit ${newStudentsData.length} élèves pour l'année ${newYear}.`
      }]);

      alert(`Félicitations ! ${newStudentsData.length} élèves ont été réinscrits pour l'année ${newYear}.`);
      setSelections({});
      router.push("/dashboard/students");
    } else {
      alert("Erreur lors de la réinscription : " + error.message);
    }
    setSaving(false);
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2">
            <RefreshCcw className="w-6 h-6 text-blue-600" /> Réinscription Annuelle
          </h1>
          <p className="text-slate-500 text-sm">Faites passer vos élèves vers la nouvelle année scolaire.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase px-2">Depuis</label>
            <select value={oldYear} onChange={e => setOldYear(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-800 bg-white">
              <option value="">Année actuelle</option>
              {years.map(y => <option key={y.id} value={y.name}>{y.name}</option>)}
            </select>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 mt-4" />
          <div>
            <label className="block text-[10px] font-bold text-emerald-600 uppercase px-2">Vers</label>
            <select value={newYear} onChange={e => setNewYear(e.target.value)} className="px-3 py-1.5 rounded-lg border-2 border-emerald-200 text-sm font-bold text-emerald-700 bg-emerald-50">
              <option value="">Nouvelle année</option>
              {years.map(y => <option key={y.id} value={y.name}>{y.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {oldYear && newYear ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
              <input type="text" placeholder="Rechercher un élève..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSelectAll} className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors">Tout sélectionner</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white text-xs text-slate-400 uppercase border-b border-slate-200">
                  <th className="p-4 w-12 text-center"><CheckCircle2 className="w-4 h-4 mx-auto opacity-50"/></th>
                  <th className="p-4 font-bold">Élève (Année {oldYear})</th>
                  <th className="p-4 font-bold">Ancienne Classe</th>
                  <th className="p-4 font-bold text-blue-600">Nouvelle Classe ({newYear})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => {
                  const isSelected = selections[student.id]?.selected || false;
                  return (
                    <tr key={student.id} className={`transition-colors ${isSelected ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}>
                      <td className="p-4 text-center">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(student)} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{student.first_name} {student.last_name}</p>
                        <p className="text-xs text-slate-500">{student.matricule}</p>
                      </td>
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold">{student.class_name}</span>
                        {student.option && <span className="text-[10px] text-slate-400 block mt-1">{student.option}</span>}
                      </td>
                      <td className="p-4">
                        <select disabled={!isSelected} value={selections[student.id]?.newClass || ""} onChange={(e) => handleClassChange(student.id, e.target.value)} className={`px-3 py-2 rounded-lg border text-sm font-semibold outline-none w-full max-w-[200px] ${isSelected ? 'border-blue-300 bg-white focus:ring-2 focus:ring-blue-500' : 'border-slate-200 bg-slate-100 text-slate-400'}`}>
                          <option value="">-- Choisir la classe --</option>
                          {classes.map(c => (
                            <option key={c.id} value={c.name}>{c.name} {c.option && `(${c.option})`}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500 italic">Aucun élève trouvé pour l'année {oldYear}.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-6 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-slate-600 text-sm">
              <HelpCircle className="w-5 h-5 text-blue-500" />
              <p>Les élèves non sélectionnés ne seront pas transférés.</p>
            </div>
            <button onClick={handleSave} disabled={saving || Object.values(selections).filter(s => s.selected).length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Valider les réinscriptions ({Object.values(selections).filter(s => s.selected).length})
            </button>
          </div>

        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <RefreshCcw className="w-16 h-16 mx-auto text-slate-200 mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Prêt pour la nouvelle année ?</h2>
          <p className="text-slate-500 max-w-md mx-auto">Sélectionnez l'année actuelle et la nouvelle année en haut de la page pour commencer.</p>
        </div>
      )}

    </div>
  );
}