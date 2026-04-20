'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Bot, Play, Plus, RefreshCw, Trash2, CheckCircle2, AlertCircle, Clock, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/loading-spinner'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'

interface IntelSource {
  id: string
  name: string
  url: string
  sourceType: string
  scopeSelector: string | null
  isActive: boolean
  minIntervalMin: number
  lastRunAt: string | null
  costUsd: number
  stats?: {
    total: number
    approved: number
    rejected: number
    pending: number
    accuracyPercent: number | null
  }
}

interface AgentSummary {
  sourcesTotal: number
  sourcesActive: number
  totalReportsFromAgent: number
  approvedFromAgent: number
  rejectedFromAgent: number
  overallAccuracyPercent: number | null
  totalCostUsd: number
  costPerApprovedUsd: number | null
}

interface IntelRun {
  id: string
  sourceId: string
  startedAt: string
  finishedAt: string | null
  status: 'running' | 'ok' | 'skipped' | 'error'
  extractedCount: number
  newReportsCount: number
  costUsd: number
  errorMessage: string | null
  source: { name: string; url: string }
}

export default function IntelAgentPage() {
  const [sources, setSources] = useState<IntelSource[]>([])
  const [runs, setRuns] = useState<IntelRun[]>([])
  const [summary, setSummary] = useState<AgentSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<string | null>(null)
  const [runningAll, setRunningAll] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', scopeSelector: '' })
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      const [s, r, sum] = await Promise.all([
        api.get('/admin/intel-agent/sources'),
        api.get('/admin/intel-agent/runs?limit=30'),
        api.get('/admin/intel-agent/summary'),
      ])
      setSources(s.data.sources ?? [])
      setRuns(r.data.runs ?? [])
      setSummary(sum.data ?? null)
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  const runOne = async (id: string) => {
    setRunning(id)
    try {
      const { data } = await api.post(`/admin/intel-agent/run/${id}`)
      toast({
        title: data.status === 'ok' ? '✅ Fonte varrida' : `⏭️ ${data.status}`,
        description:
          data.status === 'ok'
            ? `${data.extractedCount} extraídos, ${data.newReportsCount} novos · $${(data.costUsd ?? 0).toFixed(4)}`
            : 'Sem conteúdo relevante desta vez',
      })
      fetchData()
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.response?.data?.message || 'Falha', variant: 'destructive' })
    } finally { setRunning(null) }
  }

  const runAll = async () => {
    setRunningAll(true)
    try {
      const { data } = await api.post('/admin/intel-agent/run-all')
      toast({
        title: '🤖 Agentes rodaram',
        description: `${data.runsCount} fontes · ${data.totalNew} novos bônus · $${(data.totalCost ?? 0).toFixed(4)}`,
      })
      fetchData()
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    } finally { setRunningAll(false) }
  }

  const addSource = async () => {
    if (!form.name || !form.url) return
    try {
      await api.post('/admin/intel-agent/sources', {
        name: form.name,
        url: form.url,
        scopeSelector: form.scopeSelector || undefined,
      })
      toast({ title: 'Fonte adicionada' })
      setForm({ name: '', url: '', scopeSelector: '' })
      setAddOpen(false)
      fetchData()
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.response?.data?.message || 'URL inválida', variant: 'destructive' })
    }
  }

  const deleteSource = async (id: string) => {
    if (!confirm('Deletar essa fonte?')) return
    try {
      await api.delete(`/admin/intel-agent/sources/${id}`)
      fetchData()
    } catch { /* noop */ }
  }

  const toggleActive = async (s: IntelSource) => {
    try {
      await api.put(`/admin/intel-agent/sources/${s.id}`, {
        name: s.name,
        url: s.url,
        isActive: !s.isActive,
      })
      fetchData()
    } catch { /* noop */ }
  }

  if (loading) return <LoadingSpinner />

  const totalCost = sources.reduce((s, x) => s + (x.costUsd ?? 0), 0)
  const activeCount = sources.filter((s) => s.isActive).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="🤖 Agentes Inteligentes"
        description="Crawlers que escutam a web e alimentam o app com bônus automaticamente"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddOpen(!addOpen)} className="gap-2">
              <Plus className="h-4 w-4" /> Nova fonte
            </Button>
            <Button size="sm" onClick={runAll} disabled={runningAll} className="gap-2">
              {runningAll ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {runningAll ? 'Varrendo...' : 'Rodar todas'}
            </Button>
          </div>
        }
      />

      {/* Stats gerais (4 cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Fontes ativas</p>
          <p className="text-2xl font-bold">{activeCount}/{sources.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Custo total (LLM)</p>
          <p className="text-2xl font-bold">${totalCost.toFixed(3)}</p>
          <p className="text-[10px] text-muted-foreground">≈ R$ {(totalCost * 5.2).toFixed(2)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Reports do agente</p>
          <p className="text-2xl font-bold">{summary?.totalReportsFromAgent ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">
            {summary?.approvedFromAgent ?? 0} aprovados · {summary?.rejectedFromAgent ?? 0} rejeitados
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Accuracy</p>
          <p
            className={`text-2xl font-bold ${
              summary?.overallAccuracyPercent == null
                ? 'text-muted-foreground'
                : summary.overallAccuracyPercent >= 70
                ? 'text-emerald-400'
                : summary.overallAccuracyPercent >= 40
                ? 'text-amber-400'
                : 'text-red-400'
            }`}
          >
            {summary?.overallAccuracyPercent != null
              ? `${summary.overallAccuracyPercent}%`
              : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {summary?.costPerApprovedUsd != null
              ? `$${summary.costPerApprovedUsd} por aprovado`
              : 'ainda sem reviews'}
          </p>
        </div>
      </div>

      {/* Form de nova fonte */}
      {addOpen && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">Nova fonte</h3>
          <input
            placeholder="Nome (ex: Melhores Destinos)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <input
            placeholder="URL (https://...)"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <input
            placeholder="scope CSS selector opcional (ex: main.post-content)"
            value={form.scopeSelector}
            onChange={(e) => setForm({ ...form, scopeSelector: e.target.value })}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={addSource}>Criar</Button>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Lista de fontes */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Fontes configuradas
        </h2>
        <div className="space-y-2">
          {sources.map((s) => (
            <div
              key={s.id}
              className={`rounded-lg border bg-card p-4 ${!s.isActive ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-purple-400 shrink-0" />
                    <p className="font-semibold truncate">{s.name}</p>
                    {s.isActive ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                        ativo
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                        pausado
                      </span>
                    )}
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-blue-400 hover:underline truncate"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {s.url}
                  </a>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    <span>
                      Última: {s.lastRunAt ? new Date(s.lastRunAt).toLocaleString('pt-BR') : 'nunca'}
                    </span>
                    <span>Interval: {s.minIntervalMin}min</span>
                    <span>Gasto: ${s.costUsd.toFixed(4)}</span>
                    {s.stats && s.stats.total > 0 && (
                      <span className="rounded bg-slate-800 px-1.5 py-0.5">
                        {s.stats.approved}/{s.stats.approved + s.stats.rejected} aprovados
                        {s.stats.accuracyPercent != null && (
                          <span className={`ml-1 font-semibold ${
                            s.stats.accuracyPercent >= 70
                              ? 'text-emerald-400'
                              : s.stats.accuracyPercent >= 40
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}>
                            ({s.stats.accuracyPercent}%)
                          </span>
                        )}
                      </span>
                    )}
                    {s.stats && s.stats.pending > 0 && (
                      <span className="rounded bg-amber-500/15 text-amber-400 px-1.5 py-0.5">
                        {s.stats.pending} pendente{s.stats.pending > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(s)}
                    className="h-8 px-2 text-xs"
                  >
                    {s.isActive ? 'Pausar' : 'Ativar'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => runOne(s.id)}
                    disabled={running === s.id}
                    className="h-8 gap-1 text-xs"
                  >
                    {running === s.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    Rodar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteSource(s.id)}
                    className="h-8 px-2 text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Histórico de runs */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Últimas 30 execuções
        </h2>
        <div className="rounded-lg border bg-card divide-y divide-border">
          {runs.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma execução registrada ainda.
            </p>
          )}
          {runs.map((r) => {
            const StatusIcon =
              r.status === 'ok'
                ? CheckCircle2
                : r.status === 'error'
                ? AlertCircle
                : Clock
            const statusColor =
              r.status === 'ok'
                ? 'text-emerald-400'
                : r.status === 'error'
                ? 'text-red-400'
                : 'text-slate-400'
            return (
              <div key={r.id} className="flex items-center gap-3 p-3">
                <StatusIcon className={`h-4 w-4 shrink-0 ${statusColor}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.source.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(r.startedAt).toLocaleString('pt-BR')}
                    {r.errorMessage && ` · ${r.errorMessage.slice(0, 80)}`}
                  </p>
                </div>
                {r.status === 'ok' && (
                  <div className="text-right text-xs">
                    <p className="font-semibold">
                      {r.newReportsCount} novos / {r.extractedCount} extraídos
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      ${r.costUsd.toFixed(4)}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
