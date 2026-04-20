'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Check, X, RefreshCw, Megaphone, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/loading-spinner'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'

interface BonusReport {
  id: string
  reporterId: string | null
  reporterEmail: string | null
  fromProgramSlug: string
  toProgramSlug: string
  bonusPercent: number
  expiresAt: string | null
  screenshotUrl: string | null
  notes: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DUPLICATE'
  adminNotes: string | null
  createdAt: string
  reporter?: { id: string; email: string; name: string }
}

const STATUS_TABS = [
  { key: 'PENDING', label: 'Pendentes', color: 'bg-amber-500' },
  { key: 'APPROVED', label: 'Aprovados', color: 'bg-emerald-500' },
  { key: 'REJECTED', label: 'Rejeitados', color: 'bg-red-500' },
  { key: 'DUPLICATE', label: 'Duplicados', color: 'bg-slate-500' },
]

export default function BonusReportsPage() {
  const [activeTab, setActiveTab] = useState('PENDING')
  const [reports, setReports] = useState<BonusReport[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})
  const { toast } = useToast()

  const fetchReports = useCallback(async (status: string) => {
    setRefreshing(true)
    try {
      const { data } = await api.get(`/admin/bonus-reports?status=${status}`)
      setReports(data.reports || [])
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro', description: 'Não foi possível carregar', variant: 'destructive' })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [toast])

  useEffect(() => {
    fetchReports(activeTab)
  }, [activeTab, fetchReports])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api.put(`/admin/bonus-reports/${id}/${action}`, {
        adminNotes: adminNotes[id] || undefined,
      })
      toast({
        title: action === 'approve' ? 'Aprovado!' : 'Rejeitado',
        description: action === 'approve'
          ? 'Bônus virou oportunidade ativa pra todos'
          : 'Report marcado como rejeitado',
      })
      setAdminNotes((prev) => ({ ...prev, [id]: '' }))
      fetchReports(activeTab)
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.response?.data?.message || 'Falha na ação',
        variant: 'destructive',
      })
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports de Bônus"
        description="Fila de bônus reportados pelos usuários — aprove ou rejeite"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReports(activeTab)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`relative px-4 py-2 text-sm font-medium transition ${
              activeTab === t.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className={`absolute -top-1 right-0 h-2 w-2 rounded-full ${t.color}`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {reports.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-12">
            <Megaphone className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum report em <strong>{activeTab.toLowerCase()}</strong>.
            </p>
          </div>
        )}

        {reports.map((r) => (
          <div key={r.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold">
                    {r.fromProgramSlug} → {r.toProgramSlug}
                  </span>
                  <span className="rounded bg-purple-500/20 px-2 py-0.5 text-sm font-bold text-purple-600">
                    +{r.bonusPercent}%
                  </span>
                  {r.expiresAt && (
                    <span className="text-xs text-muted-foreground">
                      Expira: {new Date(r.expiresAt).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Por: {r.reporter?.name || r.reporter?.email || r.reporterEmail || 'Anônimo'}
                  {' · '}
                  {new Date(r.createdAt).toLocaleString('pt-BR')}
                </p>
                {r.notes && (
                  <p className="mt-2 rounded bg-muted/50 p-2 text-xs italic">
                    “{r.notes}”
                  </p>
                )}
                {r.screenshotUrl && (
                  <a
                    href={r.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ver comprovante
                  </a>
                )}
              </div>

              {activeTab === 'PENDING' && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nota admin (opcional)"
                    value={adminNotes[r.id] || ''}
                    onChange={(e) =>
                      setAdminNotes((prev) => ({ ...prev, [r.id]: e.target.value }))
                    }
                    className="rounded border bg-background px-2 py-1 text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleAction(r.id, 'approve')}
                    className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Check className="h-3 w-3" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleAction(r.id, 'reject')}
                    className="gap-1"
                  >
                    <X className="h-3 w-3" />
                    Rejeitar
                  </Button>
                </div>
              )}

              {activeTab !== 'PENDING' && r.adminNotes && (
                <div className="max-w-xs text-right text-xs italic text-muted-foreground">
                  Nota admin: “{r.adminNotes}”
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
