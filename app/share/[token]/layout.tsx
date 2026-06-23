import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard Compartilhado | Riguetto Tracker',
  description: 'Acompanhe suas métricas de vendas e leads em tempo real.',
};

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
