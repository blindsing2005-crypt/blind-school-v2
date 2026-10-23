"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Demande l'envoi du lien par e-mail via Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // L'URL vers laquelle l'utilisateur sera redirigé après avoir cliqué sur le lien du mail
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setError("Erreur lors de l'envoi : " + error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 relative">
      <Link href="/login" className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-semibold">
        <ArrowLeft className="w-5 h-5" /> Retour à la connexion
      </Link>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <Image src="/logo.png" alt="Logo" fill className="object-contain rounded-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Mot de passe oublié</h1>
          <p className="text-slate-500 text-sm mt-2">
            Entrez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center border border-red-100">
            {error}
          </div>
        )}

        {success ? (
          <div className="text-center space-y-4">
            <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Email envoyé !</h2>
            <p className="text-slate-500 text-sm">
              Un lien de réinitialisation a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte de réception (et vos spams).
            </p>
            <Link href="/login" className="inline-block mt-4 bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-900 transition-colors">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSendLink} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Adresse Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  placeholder="admin@ecole.com"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold mt-4 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Envoyer le lien"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}