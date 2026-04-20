'use client'

import React, { useState, useEffect } from 'react'
import { Users, CreditCard, Tag, Bell, Megaphone, Smartphone, Trophy, TrendingUp } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { MetricCard } from '@/components/metric-card'
import { LoadingPage } from '@/components/loading-spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import { formatDate, formatCPM, getInitials } from '@/lib/utils'
import type { DashboardMetrics, Offer, User } from '@/types'

function generateMockChartData() {
  const data = []
  const now = new Date()
  let users = 800
  let subscribers = 200
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    users += Math.floor(Math.random() * 30) + 5
    subscribers += Math.floor(Math.random() * 10) + 1
    data.push({
      date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      Usuários: users,
      Assinantes: subscribers,
    })
  }
  return data
}

const MOCK_CHART_DATA = generateMockChartData()

const classificationColors: Record<string, string> = {
  IMPERDIVEL: 'bg-green-500/20 text-green-400 border-green-500/30',
  BOA: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  NORMAL: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const classificationLabels: Record<string, string> = {
  IMPERDIVEL: 'Imperdível',
  BOA: 'Boa',
  NORMAL: 'Normal',
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await api.get('/admin/dashboard')
        setMetrics(response.data)
      } catch {
        setError('Erro ao carregar métricas do dashboard.')
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <LoadingPage />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#0B1120] p-6">
        <div className="rounded-md bg-red-900/20 border border-red-700 p-4 text-red-400">
          {error}
        </div>
      </div>
    )
  }

  const totalUsers = metrics?.totalUsers ?? 0
  const activeSubscribers = metrics?.activeSubscribers ?? metrics?.premiumProSubscribers ?? 0
  const activeOffers = metrics?.totalActiveOffers ?? metrics?.activeOffers ?? 0
  const alertsToday = metrics?.alertsTriggeredToday ?? 0
  const recentOffers: Offer[] = metrics?.recentOffers?.slice(0, 5) ?? []
  const recentUsers: User[] = metrics?.recentUsers?.slice(0, 5) ?? []

  // Stats das novas features (graceful pra builds antigas do backend)
  const m: any = metrics || {}
  const growth = m.growth || {}
  const crowd = m.crowdsource || {}
  const push = m.push || {}
  const topReporters: Array<{ userId: string; name: string; email: string; approvedCount: number }> =
    crowd.topReporters || []

  const chartData =
    metrics?.userGrowth && metrics.userGrowth.length > 0
      ? metrics.userGrowth.map((d) => ({
          date: formatDate(d.date),
          Usuários: d.count,
          Assinantes: Math.floor(d.count * 0.25),
        }))
      : MOCK_CHART_DATA

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://milhasextras-api.fly.dev/api/v1'

  return (
    <div className="space-y-6 bg-[#0B1120]">
      {/* Export bar */}
      <div className="flex items-center justify-end gap-2">
        <a
          href={`${API_BASE}/admin/export/users.csv`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-[#1E293B] bg-[#141C2F] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-[#1E293B] transition"
        >
          📥 Users CSV
        </a>
        <a
          href={`${API_BASE}/admin/export/bonus-reports.csv`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-[#1E293B] bg-[#141C2F] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-[#1E293B] transition"
        >
          📥 Reports CSV
        </a>
        <a
          href={`${API_BASE}/admin/export/partnerships.csv`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-[#1E293B] bg-[#141C2F] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-[#1E293B] transition"
        >
          📥 Partnerships CSV
        </a>
      </div>

      {/* Metric Cards - linha principal */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Usuários"
          value={totalUsers}
          icon={Users}
          iconClassName="bg-blue-600/20"
        />
        <MetricCard
          title="Assinantes Ativos"
          value={activeSubscribers}
          icon={CreditCard}
          iconClassName="bg-purple-600/20"
        />
        <MetricCard
          title="Ofertas Ativas"
          value={activeOffers}
          icon={Tag}
          iconClassName="bg-green-600/20"
        />
        <MetricCard
          title="Alertas Hoje"
          value={alertsToday}
          icon={Bell}
          iconClassName="bg-yellow-600/20"
        />
      </div>

      {/* Metric Cards - growth + features novas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Novos (7d)"
          value={growth.newUsersThisWeek ?? 0}
          subtitle={`${growth.newUsersThisMonth ?? 0} nos últimos 30d`}
          icon={TrendingUp}
          iconClassName="bg-cyan-600/20"
        />
        <MetricCard
          title="Taxa de Conversão"
          value={`${growth.conversionRate ?? 0}%`}
          subtitle="Free → Premium/Pro"
          icon={CreditCard}
          iconClassName="bg-fuchsia-600/20"
        />
        <MetricCard
          title="Reports Pendentes"
          value={crowd.reportsPending ?? 0}
          subtitle={`${crowd.reportsApprovedThisMonth ?? 0} aprovados (30d)`}
          icon={Megaphone}
          iconClassName="bg-amber-600/20"
        />
        <MetricCard
          title="Devices Ativos (7d)"
          value={push.devicesActive7d ?? 0}
          subtitle={`${push.devicesTotal ?? 0} registrados`}
          icon={Smartphone}
          iconClassName="bg-indigo-600/20"
        />
      </div>

      {/* Crowdsource insight: conversão crowd → paid */}
      {crowd.uniqueReporters > 0 && (
        <Card className="bg-[#141C2F] border-[#1E293B]">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              Crowdsource → Monetização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-400">Reporters únicos</p>
                <p className="text-2xl font-bold text-white">{crowd.uniqueReporters}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Viraram assinantes</p>
                <p className="text-2xl font-bold text-emerald-400">{crowd.reportersPaidCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Taxa de conversão</p>
                <p className="text-2xl font-bold text-fuchsia-400">
                  {crowd.reporterToPaidRate ?? 0}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Reports totais</p>
                <p className="text-2xl font-bold text-white">{crowd.reportsAllTime ?? 0}</p>
              </div>
            </div>

            {topReporters.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold mb-2">
                  Top 5 reporters
                </p>
                <div className="space-y-2">
                  {topReporters.map((r, i) => (
                    <div
                      key={r.userId}
                      className="flex items-center justify-between p-2 rounded bg-gray-800/30"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {['🥇', '🥈', '🥉', '🏅', '🏅'][i]}
                        </span>
                        <div>
                          <p className="text-sm text-white font-medium">{r.name}</p>
                          <p className="text-xs text-gray-500">{r.email}</p>
                        </div>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        {r.approvedCount} aprovados
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Push stats por plataforma */}
      {push.byPlatform && push.byPlatform.length > 0 && (
        <Card className="bg-[#141C2F] border-[#1E293B]">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-indigo-400" />
              Distribuição por Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {push.byPlatform.map((p: { platform: string; count: number }) => (
                <div key={p.platform} className="p-3 rounded bg-gray-800/30">
                  <p className="text-xs text-gray-400 uppercase">{p.platform}</p>
                  <p className="text-xl font-bold text-white">{p.count}</p>
                </div>
              ))}
              <div className="p-3 rounded bg-gray-800/30">
                <p className="text-xs text-gray-400 uppercase">Ativos 30d</p>
                <p className="text-xl font-bold text-emerald-400">{push.devicesActive30d ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Line Chart */}
      <Card className="bg-[#141C2F] border-[#1E293B]">
        <CardHeader>
          <CardTitle className="text-white text-base">Métricas (mock)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                tickLine={false}
                interval={4}
              />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#F9FAFB',
                }}
              />
              <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="Usuários"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="Assinantes"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Two tables side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Offers */}
        <Card className="bg-[#141C2F] border-[#1E293B]">
          <CardHeader>
            <CardTitle className="text-white text-base">Ofertas Recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1E293B]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Título
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      CPM
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Class.
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {recentOffers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-500 text-sm">
                        Nenhuma oferta recente.
                      </td>
                    </tr>
                  ) : (
                    recentOffers.map((offer) => (
                      <tr key={offer.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3 text-white truncate max-w-[160px]">
                          {offer.title}
                        </td>
                        <td className="px-4 py-3 text-gray-300">{formatCPM(offer.cpm)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${classificationColors[offer.classification] || ''}`}
                          >
                            {classificationLabels[offer.classification] || offer.classification}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card className="bg-[#141C2F] border-[#1E293B]">
          <CardHeader>
            <CardTitle className="text-white text-base">Usuários Recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1E293B]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Plano
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {recentUsers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-500 text-sm">
                        Nenhum usuário recente.
                      </td>
                    </tr>
                  ) : (
                    recentUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600/30 text-xs font-medium text-indigo-300 shrink-0">
                              {getInitials(user.name || 'U')}
                            </div>
                            <span className="text-white truncate max-w-[100px]">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-300 truncate max-w-[140px]">
                          {user.email}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={
                              user.subscriptionPlan === 'PRO'
                                ? 'border-purple-500/30 text-purple-400 bg-purple-500/10'
                                : user.subscriptionPlan === 'PREMIUM'
                                ? 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                                : 'border-gray-500/30 text-gray-400 bg-gray-500/10'
                            }
                          >
                            {user.subscriptionPlan}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
