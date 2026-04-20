'use client'

import React, { useEffect, useState } from 'react'
import { Activity, Database, Zap, Shield, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { LoadingPage } from '@/components/loading-spinner'
import api from '@/lib/api'

/**
 * Diagnostics dashboard — consolida /health/extended + /debug/status +
 * /debug/snapshots + /debug/memory em 1 tela pra ops debug rápido.
 */
export default function DiagnosticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = async () => {
    setRefreshing(true)
    try {
      const [healthRes, statusRes, snapshotsRes] = await Promise.all([
        api.get('/health/extended').catch(() => null),
        api.get('/admin/debug/status').catch(() => null),
        api.get('/admin/debug/snapshots?limit=5').catch(() => null),
      ])
      setData({
        health: healthRes?.data,
        status: statusRes?.data,
        snapshots: snapshotsRes?.data?.snapshots ?? [],
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  if (loading) return <LoadingPage />

  const health = data?.health
  const status = data?.status

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diagnostics"
        description="Status de saúde do backend + integrações"
        action={
          <Button size="sm" variant="outline" onClick={fetchAll} disabled={refreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        }
      />

      {/* Health */}
      {health && (
        <Card className="bg-[#141C2F] border-[#1E293B]">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Backend saúde · uptime {(health.uptime / 3600).toFixed(1)}h · latency {health.latencyMs}ms
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Object.entries(health.counts || {}).map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-gray-400">{k}</p>
                <p className="text-2xl font-bold text-white">{String(v).toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Integrations status */}
      {status && (
        <Card className="bg-[#141C2F] border-[#1E293B]">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-400" />
              Integrações opcionais
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Sentry', status.sentry],
              ['PostHog', status.posthog],
              ['Anthropic', status.anthropic],
              ['Stripe', status.stripe],
              ['Twilio/WhatsApp', status.twilio],
              ['Scheduler', status.scheduler],
            ].map(([name, on]: any) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-md border border-[#1E293B] bg-[#0B1120] px-3 py-2"
              >
                <span className="text-sm text-gray-300">{name}</span>
                <Badge
                  className={
                    on
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-500/20 text-slate-500 border-slate-500/30'
                  }
                >
                  {on ? 'ON' : 'off'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Snapshots canary */}
      {data?.snapshots?.length > 0 && (
        <Card className="bg-[#141C2F] border-[#1E293B]">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-amber-400" />
              Últimos 5 snapshots (canary de data loss)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/30 uppercase text-gray-400">
                <tr>
                  <th className="px-4 py-2 text-left">Quando</th>
                  <th className="px-4 py-2 text-right">Users</th>
                  <th className="px-4 py-2 text-right">Reports</th>
                  <th className="px-4 py-2 text-right">Partnerships</th>
                  <th className="px-4 py-2 text-right">Devices</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.snapshots.map((s: any) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 text-gray-300">
                      {new Date(s.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-white">
                      {s.data?.users ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-white">
                      {s.data?.bonusReports ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-white">
                      {s.data?.transferPartnerships ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-white">
                      {s.data?.deviceTokens ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Env info */}
      {status && (
        <Card className="bg-[#141C2F] border-[#1E293B]">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-400" />
              Ambiente
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <KV label="NODE_ENV" value={status.nodeEnv} />
              <KV label="Scheduler" value={status.scheduler ? 'rodando' : 'desligado'} />
              {health?.config?.scraperEnabled !== undefined && (
                <KV
                  label="Scraper"
                  value={health.config.scraperEnabled ? 'ligado' : 'desligado'}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function KV({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-mono text-white">{String(value)}</p>
    </div>
  )
}
