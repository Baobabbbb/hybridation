import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
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

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Aedis",
  description:
    "Téléchargez votre plan architectural et regardez l'IA le transformer en une pièce meublée photoréaliste. Cliquez sur n'importe quel meuble pour trouver de vrais produits à acheter.",
  keywords: ["IA", "design d'intérieur", "plan architectural", "meubles", "achat", "décoration"],
  icons: {
    icon: [{ url: "/icon.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} font-serif antialiased`}
        style={{ fontFamily: 'var(--font-playfair), serif' }}
      >
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
