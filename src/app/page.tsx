import Link from "next/link";
import Image from "next/image";
import { MonitorPlay, Globe, ShieldCheck, ArrowRight, BookOpen } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-300 font-sans selection:bg-blue-500/30">
      
      {/* HEADER */}
      <header className="fixed top-0 w-full border-b border-white/5 bg-[#070b14]/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <Image src="/logo.png" alt="Logo" fill className="object-contain" />
            </div>
            <span className="text-xl font-bold text-white tracking-wide">BLIND SCHOOL</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold hover:text-white transition-colors hidden sm:block">
              Se connecter
            </Link>
            <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-blue-600/20">
              S'inscrire
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="pt-40 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          
          <div className="relative w-32 h-32 mx-auto mb-8 animate-float">
            <Image src="/logo.png" alt="Logo Blind School" fill className="object-contain drop-shadow-[0_0_30px_rgba(37,99,235,0.3)]" />
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-tight">
            Gérez votre école <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
              intelligemment.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            La plateforme tout-en-un pour gérer les élèves, suivre les paiements en temps réel, gérer le personnel et générer des bulletins. Accédez à vos données à distance, où que vous soyez.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link href="/login" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/30">
              🚀 Accéder à mon espace
            </Link>
            <Link href="#features" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-xl font-bold transition-all">
              💻 En savoir plus
            </Link>
          </div>
        </div>
      </main>

      {/* FEATURES SECTION */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Carte 1 */}
            <div className="bg-[#0d1424] border border-white/5 p-8 rounded-3xl hover:border-blue-500/30 transition-all group">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MonitorPlay className="w-7 h-7 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Suivi des Paiements</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Sachez instantanément qui a payé, qui n'a pas payé, et combien il reste à percevoir. Générez des reçus professionnels en un clic.
              </p>
            </div>

            {/* Carte 2 */}
            <div className="bg-[#0d1424] border border-white/5 p-8 rounded-3xl hover:border-emerald-500/30 transition-all group">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Globe className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Accès à Distance</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Connectez-vous depuis n'importe quel téléphone ou ordinateur. Toutes les données de votre école sont synchronisées en temps réel.
              </p>
            </div>

            {/* Carte 3 */}
            <div className="bg-[#0d1424] border border-white/5 p-8 rounded-3xl hover:border-indigo-500/30 transition-all group">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Gestion des Utilisateurs</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Créez des comptes pour votre secrétaire, comptable ou enseignants. Attribuez-leur des droits précis pour sécuriser vos données.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10 text-center">
        <p className="text-slate-500 text-sm">
          © 2026 BLIND SCHOOL — Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}