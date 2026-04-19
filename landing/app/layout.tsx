import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Milhas Extras — Avisos instantâneos de bônus de milhas',
  description:
    'Receba notificação no celular quando Livelo, Esfera, Smiles oferecerem bônus de transferência. Ganhe R$200-2k/ano em valor extra automatizado.',
  openGraph: {
    title: 'Milhas Extras',
    description: 'Avisos instantâneos de bônus de milhas no Brasil',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
