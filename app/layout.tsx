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
  title: "MultiChat — Atendimento WhatsApp Inteligente",
  description: "Plataforma de atendimento via WhatsApp. Gerencie conversas, organize contatos e responda direto pelo navegador.",
  keywords: ["atendimento whatsapp", "multichat", "chat whatsapp web", "plataforma whatsapp"],
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    title: "MultiChat",
    description: "Atendimento WhatsApp inteligente para sua empresa.",
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
