import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "MultiChat CRM — Atendimento WhatsApp Inteligente",
  description: "Plataforma de atendimento e CRM via WhatsApp. Gerencie conversas, organize contatos no pipeline e responda direto pelo navegador.",
  keywords: ["atendimento whatsapp", "crm whatsapp", "multichat", "pipeline de vendas", "chat whatsapp web"],
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    title: "MultiChat CRM",
    description: "Atendimento WhatsApp + CRM com pipeline de vendas.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
