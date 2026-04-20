import { CpmTable } from '../components/CpmTable';
import { BonusesLive } from '../components/BonusesLive';

/**
 * Home do web app — SSR com dados live dos endpoints públicos.
 * Cache de 5min (revalidate) segue o mesmo header que o backend manda.
 */
export const revalidate = 300;

const API = process.env.NEXT_PUBLIC_API_URL || 'https://milhasextras-api.fly.dev/api/v1';

async function fetchCpm() {
  try {
    const res = await fetch(`${API}/public/cpm`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

async function fetchBonuses() {
  try {
    const res = await fetch(`${API}/public/bonuses`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export default async function Home() {
  const [cpm, bonuses] = await Promise.all([fetchCpm(), fetchBonuses()]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      {/* Hero */}
      <section className="mb-16 text-center">
        <div className="inline-block rounded-full bg-accent-purple/20 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-accent-purple">
          ✈️ Milhas Extras
        </div>
        <h1 className="mt-4 text-4xl font-extrabold md:text-6xl">
          O mercado de milhas ao vivo
        </h1>
        <p className="mt-4 mx-auto max-w-2xl text-lg text-slate-400">
          CPM médio dos principais programas, bônus de transferência ativos
          e calculadora simples — direto do app no seu navegador.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="https://milhasextras.com.br"
            className="rounded-lg bg-accent-purple px-6 py-3 font-semibold text-white hover:bg-accent-purple/90"
          >
            Abrir no app
          </a>
          <a
            href="#bonuses"
            className="rounded-lg border border-bg-border px-6 py-3 font-semibold text-white hover:bg-bg-card"
          >
            Ver bônus ativos
          </a>
        </div>
      </section>

      {/* CPM Table */}
      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-bold">CPM Atual por Programa</h2>
        <p className="mb-6 text-sm text-slate-400">
          Quanto custa, em média, cada 1.000 milhas em cada programa.
          Atualizado em tempo real pela comunidade.
        </p>
        <CpmTable data={cpm} />
      </section>

      {/* Bonuses */}
      <section id="bonuses" className="mb-12">
        <h2 className="mb-4 text-2xl font-bold">🔥 Bônus Ativos Agora</h2>
        <p className="mb-6 text-sm text-slate-400">
          Transferências com bônus extra — momento ideal pra mover saldo.
        </p>
        <BonusesLive data={bonuses} />
      </section>

      {/* Footer CTA */}
      <footer className="mt-20 border-t border-bg-border pt-8 text-center text-sm text-slate-500">
        <p>
          Dados consumidos via API pública{' '}
          <code className="rounded bg-bg-card px-2 py-0.5 text-xs text-accent-purple">
            /public/cpm
          </code>{' '}
          e{' '}
          <code className="rounded bg-bg-card px-2 py-0.5 text-xs text-accent-purple">
            /public/bonuses
          </code>
        </p>
        <p className="mt-3">
          <a href="https://milhasextras.com.br" className="text-accent-purple hover:underline">
            milhasextras.com.br
          </a>{' '}
          · Arbitragem de milhas no Brasil
        </p>
      </footer>
    </main>
  );
}
