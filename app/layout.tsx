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
  title: "Riguetto Tracker — Rastreamento Inteligente de Leads para Agências",
  description: "Plataforma de rastreamento de leads com IA para agências de marketing e tráfego pago. Conecte campanhas ao WhatsApp, classifique leads automaticamente e visualize seu funil em tempo real.",
  keywords: ["rastreamento de leads", "tracker de campanhas", "agência de marketing", "WhatsApp leads", "funil de vendas", "IA para leads"],
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    title: "Riguetto Tracker",
    description: "Rastreamento inteligente de leads para agências de tráfego pago.",
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
