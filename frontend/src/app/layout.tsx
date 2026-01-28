import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plan2Shop AI | Transformez vos plans en réalité",
  description:
    "Téléchargez votre plan architectural et regardez l'IA le transformer en une pièce meublée photoréaliste. Cliquez sur n'importe quel meuble pour trouver de vrais produits à acheter.",
  keywords: ["IA", "design d'intérieur", "plan architectural", "meubles", "achat", "décoration"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
