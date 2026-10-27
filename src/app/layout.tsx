import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // ⚠️ CETTE LIGNE EST LA CLÉ DE TON DESIGN

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BLIND SCHOOL",
  description: "Gestion scolaire simplifiée et sécurisée",
  
  // ✅ AJOUTS POUR L'INSTALLATION (PWA) ET LES ICÔNES
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png", // L'icône qui s'affiche dans l'onglet de Chrome
    apple: "/icons/icon-192.png", // L'icône pour l'iPhone (iOS)
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Blind School",
  },
};

// ✅ AJOUT POUR LA COULEUR DU THÈME SUR MOBILE
export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={inter.className}>{children}</body>
    </html>
  );
}