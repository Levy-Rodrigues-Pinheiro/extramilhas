'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Database, Zap, Globe, RefreshCw, Activity, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/loading-spinner'
import api from '@/lib/api'

interface CacheStats {
  total: number
  fresh: number
  stale: number
  uniqueRoutes: number
  byProgram: Record<string, number>
  recent: Array<{
    programSlug: string
    origin: string
    destination: string
    departDate: string
    milesRequired: number
    airline: string | null
    fetchedAt: string
    ageMinutes: number
  }>
  memory: {
    hits: number
    misses: number
    hitRate: string
    size: number
    max: number
  }
}

interface HotRoute {
  origin: string
  destination: string
  searchCount: number
}

interface HotRoutesPayload {
  days: number
  limit: number
  totalRoutes: number
  routes: HotRoute[]
}

export default function CacheStatsPage() {
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [hot, setHot] = useState<HotRoutesPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = useCallback(async () => {
    setRefreshing(true)
    try {
      const [statsRes, hotRes] = await Promise.all([
        api.get<CacheStats>('/simulator/cache-stats'),
        api.get<HotRoutesPayload>('/simulator/hot-routes?days=7&limit=30'),
      ])
      setStats(statsRes.data)
      setHot(hotRes.data)
    } catch (err) {
      console.error('Failed to load cache stats', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30_000) // auto-refresh a cada 30s
    return () => clearInterval(interval)
  }, [fetchAll])

  if (loading) return <LoadingSpinner />

  const freshPct = stats && stats.total > 0 ? ((stats.fresh / stats.total) * 100).toFixed(0) : '0'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cache & Telemetria"
        description="Cobertura do cache de voos e top rotas buscadas pelos usuários"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAll}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        }
      />

      {/* Cards de métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          icon={<Database className="h-5 w-5" />}
          label="Voos cached"
          value={stats?.total ?? 0}
          sub={`${stats?.uniqueRoutes ?? 0} rotas únicas`}
          color="text-blue-600"
        />
        <MetricCard
          icon={<Zap className="h-5 w-5" />}
          label="Frescos (<24h)"
          value={stats?.fresh ?? 0}
          sub={`${freshPct}% do total`}
          color="text-emerald-600"
        />
        <MetricCard
          icon={<Activity className="h-5 w-5" />}
          label="LRU hit rate"
          value={stats?.memory.hitRate ?? 'N/A'}
          sub={`${stats?.memory.hits ?? 0} hits / ${stats?.memory.misses ?? 0} misses`}
          color="text-purple-600"
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Buscas (7d)"
          value={hot?.routes.reduce((s, r) => s + r.searchCount, 0) ?? 0}
          sub={`${hot?.totalRoutes ?? 0} rotas buscadas`}
          color="text-orange-600"
        />
      </div>

      {/* Por programa */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Cache por programa
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          {['smiles', 'tudoazul', 'latampass'].map((slug) => (
            <div key={slug} className="flex items-center justify-between rounded-md bg-muted/50 px-4 py-3">
              <span className="font-medium capitalize">{slug}</span>
              <span className="text-lg font-bold">{stats?.byProgram[slug] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Últimas capturas */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Últimas capturas
          </h3>
          <div className="space-y-2">
            {stats?.recent.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma captura ainda.</p>
            )}
            {stats?.recent.slice(0, 10).map((r, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                <div>
                  <div className="font-medium">
                    {r.origin} → {r.destination}
                    <span className="ml-2 text-xs text-muted-foreground">({r.departDate})</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.programSlug} · {r.milesRequired.toLocaleString('pt-BR')}mi
                    {r.airline && ` · ${r.airline}`}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {ageLabel(r.ageMinutes)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top rotas buscadas */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Globe className="h-4 w-4" />
            Top rotas buscadas (7d)
          </h3>
          <div className="space-y-2">
            {hot?.routes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma busca registrada ainda. Use o simulador no app.
              </p>
            )}
            {hot?.routes.slice(0, 10).map((r, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                <span className="font-medium">
                  {r.origin} → {r.destination}
                </span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                  {r.searchCount} busca{r.searchCount !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className={`mb-2 ${color ?? ''}`}>{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground/80">{sub}</div>}
    </div>
  )
}

function ageLabel(minutes: number): string {
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes}min`
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`
  return `${Math.round(minutes / 1440)}d`
}
