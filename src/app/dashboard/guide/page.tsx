"use client";

import { 
  BookOpen, Settings, Users, Wallet, TrendingUp, 
  RefreshCcw, GraduationCap, Calendar, ShieldCheck, HelpCircle, MessageCircle
} from "lucide-react";

export default function GuidePage() {
  const steps = [
    {
      title: "1. Configuration Initiale",
      icon: Settings,
      color: "text-blue-600 bg-blue-100",
      description: "Avant de commencer, paramétrez votre école.",
      tasks: [
        "Allez dans 'Configuration' > 'Profil École' pour ajouter le nom, le logo, l'adresse et le téléphone.",
        "Dans l'onglet 'Années Scolaires', ajoutez une année (ex: 2024-2025) et cliquez sur 'Activer'.",
        "Générez automatiquement vos classes via le bouton magique dans l'onglet 'Classes'.",
        "Définissez vos frais (1ère tranche, 2ème tranche, etc.) dans l'onglet 'Frais & Tranches'."
      ]
    },
    {
      title: "2. Inscriptions des Élèves",
      icon: Users,
      color: "text-indigo-600 bg-indigo-100",
      description: "Ajoutez vos élèves dans la base de données.",
      tasks: [
        "Allez dans 'Élèves & Inscriptions' et cliquez sur 'Nouvelle Inscription'.",
        "Remplissez les informations de l'élève, des parents, et choisissez sa classe.",
        "Utilisez les filtres (Niveau, Classe, Option) pour retrouver facilement un élève.",
        "Cliquez sur 'Fiche' pour voir l'historique complet d'un élève."
      ]
    },
    {
      title: "3. Gestion des Paiements",
      icon: Wallet,
      color: "text-emerald-600 bg-emerald-100",
      description: "Encaissez les frais scolaires et générez des reçus.",
      tasks: [
        "Allez dans 'Paiements & Minerval'.",
        "Cliquez sur 'Gérer / Payer' à côté de l'élève concerné.",
        "Sélectionnez la tranche à payer et ajustez le montant si l'élève paie une partie.",
        "Validez : le reçu professionnel s'affiche immédiatement et peut être imprimé."
      ]
    },
    {
      title: "4. Rapports Financiers",
      icon: TrendingUp,
      color: "text-amber-600 bg-amber-100",
      description: "Analysez la santé financière de votre établissement.",
      tasks: [
        "Allez dans 'Rapports financiers' pour voir vos encaissements et dépenses.",
        "Utilisez le bouton 'Dépense' pour enregistrer une sortie d'argent (achat, salaire...).",
        "Consultez les bilans par jour, semaine, mois et année.",
        "Cliquez sur 'Imprimer' pour générer un document officiel avec les signatures."
      ]
    },
    {
      title: "5. Réinscriptions Annuelles",
      icon: RefreshCcw,
      color: "text-purple-600 bg-purple-100",
      description: "Faites passer vos élèves à l'année suivante en 1 clic.",
      tasks: [
        "Allez dans 'Réinscriptions'.",
        "Sélectionnez l'année actuelle (ex: 2024-2025) et la nouvelle année (ex: 2025-2026).",
        "Cochez les élèves à réinscrire et attribuez-leur leur nouvelle classe.",
        "Cliquez sur 'Valider les réinscriptions'."
      ]
    },
    {
      title: "6. Gestion du Personnel",
      icon: GraduationCap,
      color: "text-orange-600 bg-orange-100",
      description: "Gardez une trace de tous vos employés.",
      tasks: [
        "Allez dans 'Personnel & Enseignants'.",
        "Cliquez sur 'Nouveau Dossier' pour ajouter un professeur, secrétaire ou comptable.",
        "Utilisez le menu déroulant dans le tableau pour changer son statut (Actif, Abandonné, etc.)."
      ]
    },
    {
      title: "7. Vie Scolaire",
      icon: Calendar,
      color: "text-teal-600 bg-teal-100",
      description: "Organisez les événements de l'école.",
      tasks: [
        "Allez dans 'Vie scolaire'.",
        "Cliquez sur 'Nouvel Événement' pour ajouter un examen, une réunion ou un congé.",
        "L'application vous alertera automatiquement 7 jours avant l'événement."
      ]
    },
    {
      title: "8. Gestion de l'Équipe (Rôles)",
      icon: ShieldCheck,
      color: "text-cyan-600 bg-cyan-100",
      description: "Donnez des accès sécurisés à votre équipe.",
      tasks: [
        "Allez dans 'Utilisateurs & Rôles'.",
        "Créez un compte pour votre secrétaire ou comptable avec un mot de passe.",
        "Cochez précisément les modules auxquels la personne a le droit d'accéder.",
        "Elle pourra se connecter depuis son propre téléphone ou PC, et tout sera synchronisé."
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* En-tête */}
      <div className="text-center py-8">
        <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
          <BookOpen className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Guide d'Utilisation</h1>
        <p className="text-slate-500 font-medium mt-2 max-w-lg mx-auto">
          Tout ce que vous devez savoir pour maîtriser BLIND SCHOOL, étape par étape.
        </p>
      </div>

      {/* Étapes */}
      <div className="space-y-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={index} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
              {/* Barre latérale colorée */}
              <div className={`md:w-2 w-full h-2 md:h-auto ${step.color.split(' ')[1]}`}></div>
              
              <div className="p-6 md:p-8 flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 rounded-xl ${step.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{step.title}</h2>
                    <p className="text-sm text-slate-500">{step.description}</p>
                  </div>
                </div>

                <ul className="space-y-3 mt-6">
                  {step.tasks.map((task, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="bg-slate-100 text-slate-500 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <span className="text-slate-700 text-sm leading-relaxed">{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Aide supplémentaire (WhatsApp) */}
      <div className="bg-slate-800 rounded-3xl p-8 text-center text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <HelpCircle className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
          <h2 className="text-xl font-bold mb-2">Besoin d'aide supplémentaire ?</h2>
          <p className="text-slate-300 mb-8">Notre équipe est disponible sur WhatsApp pour vous accompagner.</p>
          
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <a 
              href="https://wa.me/243853929022" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/30"
            >
              <MessageCircle className="w-5 h-5" /> +243 853 929 022
            </a>
            <a 
              href="https://wa.me/243997189141" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/30"
            >
              <MessageCircle className="w-5 h-5" /> +243 997 189 141
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}