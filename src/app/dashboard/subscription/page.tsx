"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Loader2, CheckCircle2, AlertTriangle, XCircle, 
  Phone, Mail, MessageCircle, Calendar
} from "lucide-react";

export default function SubscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    const fetchSub = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: userProfile } = await supabase.from("school_users").select("school_id").eq("email", user.email).maybeSingle();
      const schoolId = userProfile?.school_id || user.id;

      const { data } = await supabase.from("subscriptions").select("*").eq("school_id", schoolId).maybeSingle();
      if (data) setSubscription(data);
      setLoading(false);
    };
    fetchSub();
  }, [router]);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  if (!subscription) return <div className="p-8 text-center text-slate-500">Aucun abonnement configuré. Contactez le support.</div>;

  const endDate = new Date(subscription.end_date);
  const today = new Date();
  const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
  const isExpired = daysLeft < 0 || subscription.status === 'Suspendu';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Abonnement & Licence</h1>
        <p className="text-slate-500 text-sm">Gérez la durée de vie de votre application.</p>
      </div>

      {/* CARTE DE STATUT */}
      <div className={`rounded-3xl p-8 border shadow-sm ${isExpired ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Statut de votre compte</p>
            <div className="flex items-center gap-3">
              {isExpired ? <XCircle className="w-8 h-8 text-red-600" /> : <CheckCircle2 className="w-8 h-8 text-emerald-500" />}
              <h2 className={`text-3xl font-black ${isExpired ? 'text-red-700' : 'text-slate-800'}`}>
                {isExpired ? "EXPIRÉ / BLOQUÉ" : "ACTIF"}
              </h2>
            </div>
          </div>
          <div className="bg-slate-100 px-4 py-2 rounded-xl text-center">
            <p className="text-xs font-bold text-slate-500 uppercase">Plan</p>
            <p className="font-black text-slate-800">{subscription.plan || "Standard"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Date de fin</p>
            <p className="font-bold text-slate-800 text-lg">{endDate.toLocaleDateString('fr-FR')}</p>
          </div>
          <div className={`p-4 rounded-xl border ${daysLeft <= 3 && !isExpired ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Temps restant</p>
            <p className={`font-bold text-lg ${daysLeft <= 3 && !isExpired ? 'text-orange-600' : 'text-slate-800'}`}>
              {isExpired ? "0 Jour" : `${daysLeft} Jours`}
            </p>
          </div>
        </div>
      </div>

      {/* BOUTONS DE CONTACT WHATSAPP & EMAIL */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-2">Besoin de renouveler ?</h2>
        <p className="text-slate-500 text-sm mb-6">Contactez l'administrateur de BLIND SCHOOL pour recharger votre compte ou obtenir plus d'informations.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a 
            href="https://wa.me/243853929022" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-emerald-200"
          >
            <MessageCircle className="w-6 h-6" /> WhatsApp (+243 853 929 022)
          </a>
          <a 
            href="https://wa.me/243997189141" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-emerald-200"
          >
            <MessageCircle className="w-6 h-6" /> WhatsApp (+243 997 189 141)
          </a>
          <a 
            href="mailto:blindsing2005@gmail.com" 
            className="md:col-span-2 flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-xl font-bold transition-all shadow-lg"
          >
            <Mail className="w-6 h-6" /> blindsing2005@gmail.com
          </a>
        </div>
      </div>

    </div>
  );
}