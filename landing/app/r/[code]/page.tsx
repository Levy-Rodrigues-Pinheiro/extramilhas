import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
  params: { code: string };
}

// OG tags — quando user compartilhar o link no WhatsApp, preview bonito
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = params.code.toUpperCase();
  return {
    title: `Ganhe 30 dias Premium grátis — Milhas Extras`,
    description: `Use o código ${code} no cadastro e ganhe 30 dias Premium. Quem indicou também ganha.`,
    openGraph: {
      title: `🎁 30 dias Premium grátis (código ${code})`,
      description:
        'Arbitragem de milhas com bônus de transferência em tempo real. Calcula o valor da sua carteira em R$.',
    },
  };
}

/**
 * /r/:code — link curto que serve 2 propósitos:
 * 1. Se abrir no celular com app instalado: o deep-link scheme (expo-linking)
 *    vai tentar abrir o app direto com ?ref=CODE
 * 2. Senão, renderiza uma landing simples explicando o bônus e redireciona
 *    pro register com ref prefilled
 *
 * Mantemos render server-side pra SEO e OG tags funcionarem quando
 * compartilhado via WhatsApp/Telegram.
 */
export default function ReferralRedirect({ params }: Props) {
  const code = params.code.toUpperCase();

  return (
    <main className="mx-auto max-w-xl px-6 py-20 text-center">
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/20 text-5xl">
        🎁
      </div>

      <h1 className="mt-6 text-3xl font-extrabold md:text-4xl">
        Você ganhou <span className="text-accent-purple">30 dias Premium</span>
      </h1>
      <p className="mt-4 text-base leading-relaxed text-slate-300">
        Seu código de indicação <strong className="text-white">{code}</strong> já está pronto.
        Baixe o Milhas Extras e cadastre-se — o bônus é aplicado automaticamente.
      </p>

      <div className="mt-10 space-y-3">
        <a
          href={`milhasextras://register?ref=${code}`}
          className="block rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-8 py-4 text-base font-bold text-white hover:opacity-90"
        >
          📱 Abrir no app (se já instalado)
        </a>
        <a
          href="https://expo.dev/artifacts/eas/umtDy7C5khrHRM2mRibDqD.apk"
          className="block rounded-xl border border-slate-700 bg-slate-900/60 px-8 py-4 text-sm font-semibold text-slate-300 hover:bg-slate-800"
        >
          ⬇️ Baixar APK Android (preview interno)
        </a>
      </div>

      <div className="mt-10 rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-left text-sm leading-relaxed text-slate-400">
        <p className="font-semibold text-white">Como funciona:</p>
        <ol className="mt-3 space-y-1 pl-5 list-decimal">
          <li>Baixe o app (Android; iOS em breve)</li>
          <li>Na tela de cadastro, o código <strong>{code}</strong> já aparece preenchido</li>
          <li>Finalize o cadastro — 30 dias Premium aplicados automaticamente</li>
          <li>Quem indicou você também ganha 30 dias. Todo mundo feliz.</li>
        </ol>
      </div>

      <p className="mt-8 text-xs text-slate-500">
        <a href="/" className="underline hover:text-slate-400">
          ← Voltar pra milhasextras.com.br
        </a>
      </p>
    </main>
  );
}
