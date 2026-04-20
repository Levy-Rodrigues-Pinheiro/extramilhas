import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contato — Milhas Extras',
  description: 'Como falar com a gente.',
};

export default function ContatoPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="mb-6 text-3xl font-bold">Fala com a gente</h1>

      <div className="space-y-5 text-slate-300">
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="mb-2 text-base font-semibold text-white">📧 Geral</h2>
          <a href="mailto:contato@milhasextras.com.br" className="text-accent-purple hover:underline">
            contato@milhasextras.com.br
          </a>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="mb-2 text-base font-semibold text-white">🔐 Privacidade (LGPD)</h2>
          <a href="mailto:privacidade@milhasextras.com.br" className="text-accent-purple hover:underline">
            privacidade@milhasextras.com.br
          </a>
          <p className="mt-2 text-sm text-slate-400">
            Pedidos de exclusão, acesso ou retificação respondidos em até 15 dias corridos.
          </p>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="mb-2 text-base font-semibold text-white">🐛 Bugs e sugestões</h2>
          <a
            href="https://github.com/Levy-Rodrigues-Pinheiro/extramilhas/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-purple hover:underline"
          >
            Abrir issue no GitHub
          </a>
        </section>

        <p className="pt-4 text-xs text-slate-500">
          <a href="/" className="underline hover:text-slate-400">← Voltar</a>
        </p>
      </div>
    </main>
  );
}
