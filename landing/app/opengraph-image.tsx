import { ImageResponse } from 'next/og';

/**
 * OG Image dinâmica — Next renderiza runtime. Aparece no preview do
 * WhatsApp/Twitter/LinkedIn quando o link é compartilhado.
 * Sem PNG asset extra, sem design tool — só JSX.
 */
export const runtime = 'edge';
export const alt = 'Milhas Extras — Arbitragem de milhas em tempo real';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #312E81 100%)',
          padding: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 40,
            color: '#A78BFA',
            fontWeight: 700,
            letterSpacing: '4px',
            marginBottom: 20,
            textTransform: 'uppercase',
          }}
        >
          ✈️ Milhas Extras
        </div>
        <div
          style={{
            fontSize: 80,
            color: '#ffffff',
            fontWeight: 800,
            lineHeight: 1.05,
            textAlign: 'center',
            letterSpacing: '-2px',
          }}
        >
          Arbitragem de milhas
        </div>
        <div
          style={{
            fontSize: 80,
            color: '#8B5CF6',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-2px',
          }}
        >
          em tempo real
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 32,
            color: '#CBD5E1',
            textAlign: 'center',
            maxWidth: 900,
          }}
        >
          Livelo · Smiles · Latam Pass · TudoAzul · Esfera
        </div>
        <div
          style={{
            marginTop: 40,
            padding: '16px 32px',
            borderRadius: 16,
            background: 'rgba(16, 185, 129, 0.15)',
            border: '2px solid #10B981',
            fontSize: 36,
            color: '#10B981',
            fontWeight: 700,
          }}
        >
          🎁 +100% de bônus? A gente te avisa em segundos.
        </div>
      </div>
    ),
    size,
  );
}
