'use client'

import React, { useState, useEffect } from 'react'
import { Users, CreditCard, Tag, Bell } from 'lucide-react'
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

  const chartData =
    metrics?.userGrowth && metrics.userGrowth.length > 0
      ? metrics.userGrowth.map((d) => ({
          date: formatDate(d.date),
          Usuários: d.count,
          Assinantes: Math.floor(d.count * 0.25),
        }))
      : MOCK_CHART_DATA

  return (
    <div className="space-y-6 bg-[#0B1120]">
      {/* Metric Cards */}
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
