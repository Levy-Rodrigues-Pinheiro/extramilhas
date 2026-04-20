'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://milhasextras-api.fly.dev/api/v1';

interface StatsData {
  users: { total: number; formatted: string };
  programs: number;
  bonuses: {
    allTime: number;
    thisWeek: number;
    thisMonth: number;
    activeNow: number;
  };
  biggestActiveBonus: {
    from: string;
    to: string;
    percent: number;
  } | null;
}

/**
 * Widget de prova social — consome /public/stats.
 * Mostra métricas reais ao invés de números inventados. Aumenta confiança
 * na landing sem tocar backend toda renderização (cache 10min).
 */
export function SocialProofStats() {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/public/stats`);
        if (!res.ok) return;
        const json = await res.json();
        setStats(json.data);
      } catch {}
    })();
  }, []);

  if (!stats) return null;

  return (
    <section className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-slate-900/80 to-purple-950/30 p-6 my-6 backdrop-blur">
      <h3 className="mb-5 text-center text-sm font-semibold uppercase tracking-wider text-purple-400">
        Os números hoje
      </h3>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Usuários" value={stats.users.formatted} />
        <Stat label="Programas monitorados" value={stats.programs} />
        <Stat label="Bônus ativos" value={stats.bonuses.activeNow} highlight />
        <Stat label="Nos últimos 30d" value={`+${stats.bonuses.thisMonth}`} />
      </div>

      {stats.biggestActiveBonus && (
        <div className="mt-5 flex flex-col items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
          <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
            🔥 Maior bônus ativo agora
          </span>
          <span className="text-base font-bold text-white">
            +{stats.biggestActiveBonus.percent.toFixed(0)}%{' '}
            {stats.biggestActiveBonus.from} → {stats.biggestActiveBonus.to}
          </span>
        </div>
      )}

      <p className="mt-4 text-center text-[11px] text-slate-500">
        Dados em tempo real · atualiza a cada 10 minutos
      </p>
    </section>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <p
        className={`text-3xl font-extrabold leading-tight md:text-4xl ${
          highlight ? 'text-emerald-400' : 'text-white'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}
