'use client'

import React, { useEffect, useState } from 'react'
import { History, Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { LoadingPage } from '@/components/loading-spinner'
import api from '@/lib/api'

interface AuditLog {
  id: string
  adminId: string
  action: string
  entityType: string
  entityId: string | null
  before: string | null
  after: string | null
  createdAt: string
  admin: { name: string; email: string } | null
}

const KNOWN_ACTIONS = ['', 'SNAPSHOT', 'UPDATE_USER_PLAN', 'APPROVE_REPORT', 'REJECT_REPORT']

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const query = filter ? `?action=${filter}&limit=100` : '?limit=100'
      const { data } = await api.get(`/admin/audit-logs${query}`)
      setLogs(data.logs ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [filter])

  if (loading && logs.length === 0) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Todas as ações administrativas registradas"
      />

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          {KNOWN_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a || 'Todas ações'}
            </option>
          ))}
        </select>
      </div>

      <Card className="bg-[#141C2F] border-[#1E293B]">
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">Nenhum log encontrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-800/30 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-4 py-2 text-left">Quando</th>
                  <th className="px-4 py-2 text-left">Admin</th>
                  <th className="px-4 py-2 text-left">Ação</th>
                  <th className="px-4 py-2 text-left">Entidade</th>
                  <th className="px-4 py-2 text-left">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2 text-gray-300">
                      {new Date(l.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-2 text-white">{l.admin?.name ?? 'system'}</td>
                    <td className="px-4 py-2">
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                        {l.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-gray-400">{l.entityType}{l.entityId ? ` · ${l.entityId.slice(0, 8)}` : ''}</td>
                    <td className="px-4 py-2 text-xs text-gray-400">
                      {l.after ? (
                        <details>
                          <summary className="cursor-pointer">ver JSON</summary>
                          <pre className="mt-1 max-h-32 overflow-auto rounded bg-slate-900 p-2 text-[10px]">
                            {(() => {
                              try {
                                return JSON.stringify(JSON.parse(l.after!), null, 2)
                              } catch {
                                return l.after
                              }
                            })()}
                          </pre>
                        </details>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
