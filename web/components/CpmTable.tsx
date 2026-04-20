interface Program {
  slug: string;
  name: string;
  avgCpm: number;
  logoUrl: string | null;
  updatedAt: string;
}

export function CpmTable({ data }: { data: { programs: Program[] } | null }) {
  if (!data || data.programs.length === 0) {
    return (
      <div className="rounded-lg border border-bg-border bg-bg-card p-8 text-center text-sm text-slate-500">
        Sem dados disponíveis no momento.
      </div>
    );
  }

  const best = data.programs[0];

  return (
    <div className="overflow-hidden rounded-xl border border-bg-border bg-bg-card">
      <table className="w-full text-sm">
        <thead className="bg-slate-800/50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-300">Programa</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-300">CPM (R$ / 1k)</th>
            <th className="hidden px-4 py-3 text-right font-semibold text-slate-300 md:table-cell">
              Diferença p/ melhor
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-bg-border">
          {data.programs.map((p, i) => {
            const diff = i === 0 ? 0 : ((p.avgCpm - best.avgCpm) / best.avgCpm) * 100;
            return (
              <tr key={p.slug} className="hover:bg-slate-800/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {i === 0 && <span>🏆</span>}
                    <span className="font-semibold text-white">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                  R$ {p.avgCpm.toFixed(2)}
                </td>
                <td className="hidden px-4 py-3 text-right text-slate-400 md:table-cell">
                  {i === 0 ? '—' : `+${diff.toFixed(1)}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
