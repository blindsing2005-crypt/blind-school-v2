"use client";

import { GraduationCap, MapPin, Mail, ShieldCheck, Code2, Network, Award, Heart } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* En-tête */}
      <div className="text-center py-10 bg-white rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
        <div className="relative z-10 mt-10">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-xl mx-auto flex items-center justify-center border-4 border-white mb-4">
            <GraduationCap className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">BLIND SCHOOL</h1>
          <p className="text-slate-500 font-medium mt-1">Gestion scolaire simplifiée et sécurisée</p>
        </div>
      </div>

      {/* Section Mission */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Award className="w-6 h-6 text-blue-600" /> 1. Mission & Vision
        </h2>
        <div className="space-y-4 text-slate-600 leading-relaxed">
          <p>
            Conçue et développée par <strong>GROUP BLIND</strong> (alias <strong>Blessing</strong>), cette application est née d'une passion pour l'ingénierie réseau, la sécurité informatique et le développement web moderne.
          </p>
          <p>
            Notre objectif est de proposer une expérience fluide, intuitive et performante, adaptée aux besoins réels des établissements scolaires. Nous croyons que la gestion d'une école ne doit pas être un casse-tête, mais un levier pour l'excellence éducative.
          </p>
        </div>
      </div>

      {/* Section Développeur */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Code2 className="w-6 h-6 text-indigo-600" /> 2. À propos du Développeur
        </h2>
        
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Fondateur & Développeur Lead</p>
              <p className="text-2xl font-black text-slate-800">AMISI FATAKI OLIVIER <span className="text-slate-400 text-lg">(Blessing)</span></p>
            </div>
            <div className="flex items-start gap-3">
              <Network className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
              <p className="text-slate-600">
                <strong>Formation & Profil :</strong> Une solide expertise en réseaux, cybersécurité et développement d'applications web (Next.js, Supabase, interfaces UI/UX).
              </p>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
              <p>Lubumbashi, République Démocratique du Congo 🇨🇩</p>
            </div>
          </div>
          
          <div className="w-full md:w-48 h-48 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center flex-col text-slate-400">
            <Heart className="w-10 h-10 mb-2" />
            <span className="text-xs font-bold text-center px-4">Fait avec passion en RDC</span>
          </div>
        </div>
      </div>

      {/* Section Contact */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600" /> 3. Contact & Support
        </h2>
        <p className="text-slate-600 mb-6">Pour toute question, suggestion ou retour d'expérience :</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="mailto:blindsing2005@gmail.com" className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="bg-blue-100 p-3 rounded-lg text-blue-600"><Mail className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Email</p>
              <p className="font-bold text-slate-800">blindsing2005@gmail.com</p>
            </div>
          </a>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600"><MapPin className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Localisation</p>
              <p className="font-bold text-slate-800">Lubumbashi, RDC</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-8 border-t border-slate-200">
        <p className="text-sm font-medium text-slate-500">
          Tous droits réservés © 2026 <strong>Blessing Blind</strong> - GROUP BLIND
        </p>
      </div>

    </div>
  );
}