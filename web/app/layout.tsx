import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Milhas Extras — Arbitragem de Milhas',
  description:
    'Calcule quanto suas milhas valem e descubra oportunidades de transferência com bônus em tempo real. Livelo, Smiles, Latam Pass, TudoAzul.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-bg">{children}</body>
    </html>
  );
}
