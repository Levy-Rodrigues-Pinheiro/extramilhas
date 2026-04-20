import type { Metadata } from 'next';
import './globals.css';

const SITE_URL = 'https://milhasextras.com.br';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Milhas Extras — Arbitragem e bônus de milhas em tempo real',
    template: '%s · Milhas Extras',
  },
  description:
    'Receba notificação instantânea quando Livelo, Esfera, Smiles ou Latam Pass oferecerem bônus de transferência. Calculadora de valor real da carteira em R$. Grátis pra começar.',
  keywords: [
    'milhas',
    'bônus de transferência',
    'Livelo',
    'Smiles',
    'Latam Pass',
    'TudoAzul',
    'Esfera',
    'arbitragem de milhas',
    'passagens com milhas',
  ],
  authors: [{ name: 'Milhas Extras' }],
  openGraph: {
    title: 'Milhas Extras — Bônus de milhas em tempo real',
    description:
      'Nunca mais perca um bônus de transferência. Notificações via push e WhatsApp quando Livelo→Smiles bate 100%, Esfera→Latam 80%, etc.',
    type: 'website',
    url: SITE_URL,
    locale: 'pt_BR',
    siteName: 'Milhas Extras',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Milhas Extras — Arbitragem de milhas em tempo real',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Milhas Extras',
    description: 'Arbitragem de milhas em tempo real no Brasil',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
