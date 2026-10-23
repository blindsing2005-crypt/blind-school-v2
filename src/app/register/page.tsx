"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, School, UserPlus, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email, 
      password,
      options: { data: { school_name: schoolName, role: "Administrateur" } },
    });

    if (signUpError) {
      setError(signUpError.message.includes("security") ? "Veuillez patienter un instant avant de réessayer." : signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const userId = data.user.id;

      // 1. Créer l'admin dans la table
      await supabase.from("school_users").insert([{
        school_id: userId,
        email: email,
        username: "Administrateur",
        role: "Administrateur",
        permissions: { dashboard: true, students: true, re_enrollment: true, finance: true, reports: true, staff: true, life: true }
      }]);

      // 2. Créer l'abonnement de 1 mois
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      await supabase.from("subscriptions").insert([{
        school_id: userId,
        school_name: schoolName,
        owner_email: email,
        plan: "Standard",
        start_date: new Date().toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: "Actif"
      }]);

      // 3. ✅ CRÉER LES CLASSES PAR DÉFAUT (SANS LES OPTIONS)
      const defaultClasses = [
        // Maternelle
        { school_id: userId, level: "Maternelle", name: "1ère" },
        { school_id: userId, level: "Maternelle", name: "2ème" },
        { school_id: userId, level: "Maternelle", name: "3ème" },
        // Primaire
        { school_id: userId, level: "Primaire", name: "1ère" },
        { school_id: userId, level: "Primaire", name: "2ème" },
        { school_id: userId, level: "Primaire", name: "3ème" },
        { school_id: userId, level: "Primaire", name: "4ème" },
        { school_id: userId, level: "Primaire", name: "5ème" },
        { school_id: userId, level: "Primaire", name: "6ème" },
        // Secondaire (7 et 8)
        { school_id: userId, level: "Secondaire", name: "7ème A" },
        { school_id: userId, level: "Secondaire", name: "7ème B" },
        { school_id: userId, level: "Secondaire", name: "8ème A" },
        { school_id: userId, level: "Secondaire", name: "8ème B" },
        // Secondaire (1ère à 4ème)
        { school_id: userId, level: "Secondaire", name: "1ère A" },
        { school_id: userId, level: "Secondaire", name: "1ère B" },
        { school_id: userId, level: "Secondaire", name: "2ème A" },
        { school_id: userId, level: "Secondaire", name: "2ème B" },
        { school_id: userId, level: "Secondaire", name: "3ème A" },
        { school_id: userId, level: "Secondaire", name: "3ème B" },
        { school_id: userId, level: "Secondaire", name: "4ème A" },
        { school_id: userId, level: "Secondaire", name: "4ème B" },
      ];
      await supabase.from("classes").insert(defaultClasses);

      // 4. ✅ CRÉER LES OPTIONS PAR DÉFAUT
      const defaultOptions = [
        "Scientifique", "Littéraire", "Pédagogique", "Mécanique Auto", 
        "Mécanique Générale", "Électricité", "Commerciale & Gestion", 
        "Coupe & Couture", "Construction", "Informatique", "Électronique"
      ];
      const optionsToInsert = defaultOptions.map(opt => ({ school_id: userId, name: opt }));
      await supabase.from("options").insert(optionsToInsert);
    }

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* EFFET DE FLOU EN ARRIÈRE-PLAN */}
      <div className="absolute inset-0 bg-[#070b14]">
        <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-600/20 rounded-full blur-[100px]"></div>
      </div>

      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-semibold z-20">
        <ArrowLeft className="w-5 h-5" /> Retour à l'accueil
      </Link>

      <div className="w-full max-w-md bg-[#0d1424]/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 relative z-10">
        
        <div className="text-center mb-8">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <Image src="/logo.png" alt="Logo" fill className="object-contain rounded-2xl drop-shadow-[0_0_15px_rgba(37,99,235,0.3)]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Créer un espace</h1>
          <p className="text-slate-400 text-sm mt-1">Rejoignez la plateforme BLIND SCHOOL</p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-sm mb-6 text-center border border-red-500/20">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nom de l'établissement</label>
            <div className="relative">
              <School className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
              <input type="text" required value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full bg-[#070b14] text-white pl-10 pr-4 py-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600" placeholder="Ex: Complexe Scolaire La Grâce" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Adresse Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#070b14] text-white pl-10 pr-4 py-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600" placeholder="admin@ecole.com" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
              <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#070b14] text-white pl-10 pr-12 py-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600" placeholder="••••••••" minLength={6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-600/30 disabled:opacity-70 mt-6">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
            {loading ? "Création en cours..." : "Créer mon espace"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 font-medium mt-6">
          Vous avez déjà un compte ?{" "}
          <Link href="/login" className="text-blue-400 font-bold hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}