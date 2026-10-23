"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Loader2, Plus, Trash2, Calendar as CalendarIcon, Clock, 
  BookOpen, Users, Bell, AlertTriangle, X, CheckCircle2, Info
} from "lucide-react";

export default function SchoolLifePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [events, setEvents] = useState<any[]>([]);
  const [actualSchoolId, setActualSchoolId] = useState("");
  const [username, setUsername] = useState("");
  const [userRole, setUserRole] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_date: "", // ✅ On laisse vide au départ
    event_type: "Activité"
  });

  // ✅ On ajoute la date une fois que la page est chargée (côté client)
  useEffect(() => {
    setFormData(prev => ({ 
      ...prev, 
      event_date: new Date().toISOString().split('T')[0] 
    }));
  }, []);

  const eventTypes = [
    { label: "Examen", color: "bg-red-100 text-red-700 border-red-200", icon: BookOpen },
    { label: "Réunion", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Users },
    { label: "Congé", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CalendarIcon },
    { label: "Activité", color: "bg-orange-100 text-orange-700 border-orange-200", icon: Clock }
  ];

  const fetchEvents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const { data: userProfile } = await supabase.from("school_users").select("school_id, username, role").eq("email", user.email).maybeSingle();
    const schoolIdToUse = userProfile?.school_id || user.id;
    
    setActualSchoolId(schoolIdToUse);
    setUsername(userProfile?.username || "Administrateur");
    setUserRole(userProfile?.role || "Administrateur");

    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("school_id", schoolIdToUse)
      .order("event_date", { ascending: true });

    if (data) setEvents(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const { error } = await supabase.from("events").insert([{
      school_id: actualSchoolId,
      ...formData
    }]);

    if (!error) {
      await supabase.from("activity_logs").insert([{
        school_id: actualSchoolId,
        user_name: `${username} (${userRole})`,
        action: "Vie scolaire",
        details: `A ajouté l'événement "${formData.title}" prévu le ${formData.event_date}`
      }]);

      setIsModalOpen(false);
      setFormData({ title: "", description: "", event_date: new Date().toISOString().split('T')[0], event_type: "Activité" });
      fetchEvents();
    } else {
      alert("Erreur : " + error.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet événement du calendrier ?")) return;
    await supabase.from("events").delete().eq("id", id);
    setEvents(events.filter(e => e.id !== id));
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = events.filter(e => {
    const eDate = new Date(e.event_date);
    eDate.setHours(0, 0, 0, 0);
    return eDate >= today;
  });

  const pastEvents = events.filter(e => {
    const eDate = new Date(e.event_date);
    eDate.setHours(0, 0, 0, 0);
    return eDate < today;
  });

  const imminentEvents = upcomingEvents.map(event => {
    const eDate = new Date(event.event_date);
    eDate.setHours(0, 0, 0, 0);
    const diffTime = eDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { ...event, daysLeft: diffDays };
  }).filter(event => event.daysLeft <= 7);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Vie Scolaire</h1>
          <p className="text-slate-500 text-sm">Calendrier des événements, examens et réunions</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all">
          <Plus className="w-5 h-5" /> Nouvel Événement
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h2 className="font-bold text-slate-800">Événements à venir ({upcomingEvents.length})</h2>
            </div>
            <div className="p-6 space-y-4">
              {upcomingEvents.map(event => {
                const typeInfo = eventTypes.find(t => t.label === event.event_type) || eventTypes[3];
                const Icon = typeInfo.icon;
                return (
                  <div key={event.id} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:shadow-md transition-all bg-white group">
                    <div className={`p-3 rounded-xl border ${typeInfo.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg">{event.title}</h3>
                          <p className="text-sm text-slate-500 mt-1">{new Date(event.event_date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${typeInfo.color}`}>{event.event_type}</span>
                      </div>
                      {event.description && <p className="text-slate-600 mt-3 text-sm">{event.description}</p>}
                    </div>
                    <button onClick={() => handleDelete(event.id)} className="text-slate-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
              {upcomingEvents.length === 0 && <p className="text-center text-slate-500 italic py-4">Aucun événement à venir.</p>}
            </div>
          </div>

          {pastEvents.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden opacity-75">
              <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
                <h2 className="font-bold text-slate-600">Événements passés</h2>
              </div>
              <div className="p-6 space-y-4">
                {pastEvents.map(event => (
                  <div key={event.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="text-slate-400"><CalendarIcon className="w-5 h-5" /></div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-600 line-through">{event.title}</h3>
                      <p className="text-xs text-slate-400">{new Date(event.event_date).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Bell className="w-24 h-24 text-blue-600" />
            </div>
            
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 relative z-10">
              <Bell className="w-5 h-5 text-blue-600"/> Rappels Importants
            </h2>

            {imminentEvents.length === 0 ? (
              <div className="text-center py-8">
                <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="font-bold text-slate-700">Tout est calme !</p>
                <p className="text-sm text-slate-500 mt-1">Aucun événement imminent dans les 7 prochains jours.</p>
              </div>
            ) : (
              <div className="space-y-4 relative z-10">
                {imminentEvents.map(event => {
                  let urgencyColor = "bg-blue-50 border-blue-200 text-blue-800";
                  let urgencyText = `Dans ${event.daysLeft} jours`;
                  
                  if (event.daysLeft === 0) {
                    urgencyColor = "bg-red-50 border-red-200 text-red-800";
                    urgencyText = "C'est aujourd'hui !";
                  } else if (event.daysLeft === 1) {
                    urgencyColor = "bg-orange-50 border-orange-200 text-orange-800";
                    urgencyText = "Demain";
                  }

                  return (
                    <div key={event.id} className={`p-4 rounded-xl border ${urgencyColor} flex items-start gap-3`}>
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm">{event.title}</p>
                        <p className="text-xs font-bold mt-1 uppercase tracking-wider">{urgencyText}</p>
                        <p className="text-xs mt-1 opacity-80">{new Date(event.event_date).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-8 bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                Ce panneau vous alerte automatiquement 7 jours avant un événement pour que vous puissiez vous organiser.
              </p>
            </div>
          </div>
        </div>

      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><CalendarIcon className="w-5 h-5"/> Nouvel Événement</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white bg-white/10 rounded-full p-1"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titre de l'événement</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Examen de Mathématiques" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input required type="date" value={formData.event_date} onChange={e => setFormData({...formData, event_date: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select value={formData.event_type} onChange={e => setFormData({...formData, event_type: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none bg-white focus:ring-2 focus:ring-blue-500">
                    {eventTypes.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optionnel)</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none" placeholder="Détails de l'événement..."></textarea>
              </div>

              <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold mt-4 flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Ajouter au calendrier
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}