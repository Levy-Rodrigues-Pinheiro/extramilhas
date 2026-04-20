/**
 * Helpers de formatação padronizados pra todo o app.
 * Usar aqui evita cada tela ter sua própria lógica de pt-BR / relative time.
 */

export function formatBrl(value: number, fractionDigits = 2): string {
  return `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

export function formatPoints(value: number): string {
  return value.toLocaleString('pt-BR');
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return `${value.toFixed(fractionDigits)}%`;
}

/**
 * Tempo relativo humanizado: "agora", "5min", "2h", "3d".
 * Pra timestamps >30d retorna data curta "20 abr".
 */
export function formatRelativeTime(iso: string | Date): string {
  const then = typeof iso === 'string' ? new Date(iso).getTime() : iso.getTime();
  const now = Date.now();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  if (diffD < 30) return `${Math.floor(diffD / 7)}sem`;
  return new Date(then).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Trunca string longa adicionando ellipsis. Útil pra nomes de programa
 * ou textos que não cabem em pills/badges.
 */
export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}
