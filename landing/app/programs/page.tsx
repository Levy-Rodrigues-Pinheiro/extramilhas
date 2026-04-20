import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Programas de milhas · CPM atualizado',
  description:
    'CPM (custo por mil milhas) atualizado dos principais programas brasileiros: Livelo, Esfera, Smiles, TudoAzul, Latam Pass. Compare e descubra qual vale mais.',
  keywords: [
    'cpm livelo',
    'cpm smiles',
    'cpm tudoazul',
    'cpm latam pass',
    'valor milhas',
    'quanto vale milhas',
  ],
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://milhasextras-api.fly.dev/api/v1';

interface Program {
  slug: string;
  name: string;
  avgCpm: number;
  logoUrl: string | null;
  websiteUrl: string | null;
  updatedAt: string;
}

async function fetchPrograms(): Promise<Program[]> {
  try {
    const res = await fetch(`${API_URL}/public/cpm`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.programs ?? [];
  } catch {
    return [];
  }
}

export const revalidate = 300;

export default async function ProgramsPage() {
  const programs = await fetchPrograms();

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-12">
        <h1 className="text-4xl font-bold">Programas de milhas</h1>
        <p className="mt-3 text-slate-400">
          CPM atualizado dos principais programas brasileiros. Quanto menor o CPM, mais
          barato acumular milhas naquele programa.
        </p>
      </header>

      {/* Tabela detalhada */}
      <section className="mb-12 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/40">
            <tr>
              <th className="px-5 py-4 text-left font-semibold text-slate-300">Programa</th>
              <th className="px-5 py-4 text-right font-semibold text-slate-300">
                CPM (R$ / 1k milhas)
              </th>
              <th className="hidden px-5 py-4 text-right font-semibold text-slate-300 md:table-cell">
                Atualizado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {programs.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-12 text-center text-sm text-slate-500">
                  Dados temporariamente indisponíveis. Tente em alguns minutos.
                </td>
              </tr>
            )}
            {programs.map((p, i) => (
              <tr key={p.slug} className="hover:bg-slate-800/30">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {i === 0 && <span title="Mais barato">🏆</span>}
                    <div>
                      <p className="font-semibold text-white">{p.name}</p>
                      {p.websiteUrl && (
                        <a
                          href={p.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-slate-500 hover:text-accent-purple"
                        >
                          site oficial →
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <span
                    className={`font-mono text-lg font-bold ${
                      i === 0 ? 'text-emerald-400' : 'text-white'
                    }`}
                  >
                    R$ {p.avgCpm.toFixed(2)}
                  </span>
                </td>
                <td className="hidden px-5 py-4 text-right text-xs text-slate-500 md:table-cell">
                  {new Date(p.updatedAt).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Explicação CPM */}
      <section className="mb-12 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="mb-3 text-xl font-bold">Como interpretar o CPM</h2>
        <p className="mb-3 text-sm leading-relaxed text-slate-300">
          CPM é o <strong className="text-white">custo médio de mercado</strong> pra
          adquirir 1.000 milhas naquele programa. Serve de referência pra 2 decisões:
        </p>
        <ul className="ml-5 list-disc space-y-2 text-sm text-slate-300">
          <li>
            <strong className="text-white">Transferir ou não</strong>: se o CPM efetivo
            (origem ÷ bônus) for menor que o CPM do destino, vale transferir.
          </li>
          <li>
            <strong className="text-white">Acumular ou usar</strong>: programas com CPM
            baixo são bons pra acumular passivamente; CPM alto, usar logo.
          </li>
        </ul>
        <p className="mt-4 text-sm text-slate-400">
          CPM oscila toda semana conforme oferta. Nosso app atualiza automaticamente.
        </p>
      </section>

      {/* CTA */}
      <section className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-slate-900/40 p-6 text-center">
        <h2 className="mb-2 text-2xl font-bold">Use isso pra ganhar dinheiro</h2>
        <p className="mb-6 text-sm text-slate-400">
          Baixe o Milhas Extras e configure alerta pros bônus de transferência entre os
          programas acima — a gente te avisa no momento certo.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-3 font-semibold text-white hover:opacity-90"
        >
          Abrir app →
        </Link>
      </section>

      <p className="mt-12 text-center text-xs text-slate-500">
        <Link href="/" className="underline hover:text-slate-400">
          ← Voltar pra home
        </Link>
      </p>
    </main>
  );
}
