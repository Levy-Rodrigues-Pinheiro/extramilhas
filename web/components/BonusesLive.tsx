interface Partnership {
  from: string;
  to: string;
  fromName: string;
  toName: string;
  bonusPercent: number;
  baseRate: number;
  expiresAt: string | null;
}

export function BonusesLive({ data }: { data: { partnerships: Partnership[] } | null }) {
  if (!data || data.partnerships.length === 0) {
    return (
      <div className="rounded-lg border border-bg-border bg-bg-card p-8 text-center text-sm text-slate-500">
        Nenhum bônus de transferência ativo no momento. Volte em breve.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {data.partnerships.map((p, i) => {
        const isHot = p.bonusPercent >= 80;
        const isGood = p.bonusPercent >= 40;
        return (
          <article
            key={`${p.from}-${p.to}-${i}`}
            className={`relative overflow-hidden rounded-xl border p-4 transition ${
              isHot
                ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-bg-card'
                : isGood
                ? 'border-accent-amber/30 bg-gradient-to-br from-accent-amber/10 to-bg-card'
                : 'border-bg-border bg-bg-card'
            }`}
          >
            {isHot && (
              <span className="absolute right-3 top-3 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                🔥 Imperdível
              </span>
            )}

            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  De {p.fromName}
                </p>
                <p className="text-base font-semibold text-white">
                  Pra <span className="text-accent-purple">{p.toName}</span>
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-3xl font-bold ${
                    isHot
                      ? 'text-emerald-400'
                      : isGood
                      ? 'text-accent-amber'
                      : 'text-white'
                  }`}
                >
                  +{p.bonusPercent.toFixed(0)}%
                </p>
                <p className="text-[10px] uppercase text-slate-500">bônus</p>
              </div>
            </div>

            {p.expiresAt && (
              <p className="mt-3 text-xs text-slate-500">
                Expira em: {new Date(p.expiresAt).toLocaleDateString('pt-BR')}
              </p>
            )}

            <p className="mt-2 text-xs text-slate-400">
              Cada 1.000 {p.fromName} vira{' '}
              <span className="font-semibold text-white">
                {(p.baseRate * (1 + p.bonusPercent / 100) * 1000).toFixed(0).toLocaleString()}
              </span>{' '}
              {p.toName}
            </p>
          </article>
        );
      })}
    </div>
  );
}
