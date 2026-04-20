'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://milhasextras-api.fly.dev/api/v1';

interface Partnership {
  from: string;
  to: string;
  fromName: string;
  toName: string;
  bonusPercent: number;
  baseRate: number;
  expiresAt: string | null;
}

/**
 * Widget de "bônus de transferência ao vivo" — consome o endpoint público
 * /public/bonuses pra mostrar dados reais, sem backend intermediário.
 *
 * Renderiza client-side pra pegar dados sempre frescos + proveniência
 * honesta. Fallback discreto se API falhar (site não quebra).
 */
export function LiveBonuses() {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/public/bonuses`);
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        setPartnerships(json.data?.partnerships ?? []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-purple-500/20 bg-slate-900/40 p-8 backdrop-blur">
        <div className="h-5 w-32 animate-pulse rounded bg-slate-700" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error || partnerships.length === 0) {
    // Silencioso — não queremos estragar a landing
    return null;
  }

  return (
    <section className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-slate-900/60 to-purple-900/20 p-6 backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">
            🔥 Bônus ativos agora
          </h3>
          <p className="text-xs text-slate-400">
            Dados reais, atualizados a cada 5 minutos
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Ao vivo
        </span>
      </div>

      <ul className="mt-4 divide-y divide-slate-800">
        {partnerships.slice(0, 5).map((p, i) => (
          <li
            key={`${p.from}-${p.to}-${i}`}
            className="flex items-center justify-between py-3"
          >
            <div>
              <p className="text-sm font-medium text-white">
                {p.fromName} → {p.toName}
              </p>
              {p.expiresAt && (
                <p className="text-[10px] text-slate-500">
                  Expira: {new Date(p.expiresAt).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
            <span
              className={`text-lg font-bold ${
                p.bonusPercent >= 80
                  ? 'text-emerald-400'
                  : p.bonusPercent >= 40
                  ? 'text-amber-400'
                  : 'text-slate-300'
              }`}
            >
              +{p.bonusPercent.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>

      {partnerships.length > 5 && (
        <p className="mt-3 text-center text-xs text-slate-500">
          +{partnerships.length - 5} mais dentro do app
        </p>
      )}
    </section>
  );
}
