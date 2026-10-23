import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // ⚠️ CETTE LIGNE EST LA CLÉ DE TON DESIGN

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BLIND SCHOOL",
  description: "Gestion scolaire simplifiée et sécurisée",
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