'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Award,
  Wallet,
  TrendingUp,
  Bell,
  Gift,
  Clock,
  Crown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingPage } from '@/components/loading-spinner'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'

interface UserDetail {
  id: string
  name: string
  email: string
  subscriptionPlan: 'FREE' | 'PREMIUM' | 'PRO'
  subscriptionExpiresAt: string | null
  isAdmin: boolean
  createdAt: string
  whatsappPhone: string | null
  referralCode: string | null
  lastActiveAt: string | null
  milesBalances: Array<{
    balance: number
    program: { name: string; slug: string }
  }>
  preferences: any
  enrichedStats: {
    reportsApproved: number
    reportsRejected: number
    accuracyPercent: number | null
    referralsCount: number
    notificationsUnread: number
    lastActive: string | null
    walletTotalBrl: number
  }
  _count: {
    alerts: number
    savedOffers: number
    bonusReports: number
    deviceTokens: number
    notifications: number
  }
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get(`/admin/users/${params.id}`)
        setUser(data)
      } catch {
        toast({ title: 'Erro', description: 'User não encontrado', variant: 'destructive' })
        router.push('/users')
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [params.id, router, toast])

  const changePlan = async (plan: 'FREE' | 'PREMIUM' | 'PRO') => {
    if (!confirm(`Mudar plano pra ${plan}?`)) return
    try {
      await api.put(`/admin/users/${params.id}/plan`, { plan })
      toast({ title: 'Plano alterado', description: `Agora: ${plan}` })
      const { data } = await api.get(`/admin/users/${params.id}`)
      setUser(data)
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  if (loading) return <LoadingPage />
  if (!user) return null

  const stats = user.enrichedStats
  const plan = user.subscriptionPlan
  const planColor =
    plan === 'PRO'
      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      : plan === 'PREMIUM'
      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      : 'bg-slate-500/20 text-slate-400 border-slate-500/30'

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Usuários', href: '/users' }, { label: user.name }]} />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/users')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      {/* Header */}
      <Card className="bg-[#141C2F] border-[#1E293B]">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-2xl font-bold">
                {user.name[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-white">{user.name}</h1>
                  {user.isAdmin && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      <Crown className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-gray-400">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </div>
                {user.whatsappPhone && (
                  <div className="mt-0.5 text-xs text-slate-500">📱 {user.whatsappPhone}</div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className={planColor}>{plan}</Badge>
              {plan === 'FREE' ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => changePlan('PREMIUM')}>
                    → Premium
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => changePlan('PRO')}>
                    → Pro
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => changePlan('FREE')}>
                  Downgrade → Free
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Carteira"
          value={`R$ ${stats.walletTotalBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          color="text-emerald-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Reports aprovados"
          value={stats.reportsApproved}
          sublabel={
            stats.accuracyPercent != null
              ? `${stats.accuracyPercent}% accuracy`
              : 'sem histórico'
          }
          color="text-purple-400"
        />
        <StatCard
          icon={Gift}
          label="Referrals"
          value={stats.referralsCount}
          sublabel={`Code: ${user.referralCode || '—'}`}
          color="text-amber-400"
        />
        <StatCard
          icon={Bell}
          label="Notifs não lidas"
          value={stats.notificationsUnread}
          sublabel={`${user._count.deviceTokens} devices`}
          color="text-blue-400"
        />
      </div>

      {/* Activity info */}
      <Card className="bg-[#141C2F] border-[#1E293B]">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Atividade
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs text-gray-400">Registrado em</p>
            <p className="font-medium text-white">
              {new Date(user.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Última atividade</p>
            <p className="font-medium text-white">
              {stats.lastActive
                ? new Date(stats.lastActive).toLocaleString('pt-BR')
                : 'Nunca abriu o app'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Plano expira</p>
            <p className="font-medium text-white">
              {user.subscriptionExpiresAt
                ? new Date(user.subscriptionExpiresAt).toLocaleDateString('pt-BR')
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Alertas ativos</p>
            <p className="font-medium text-white">{user._count.alerts}</p>
          </div>
        </CardContent>
      </Card>

      {/* Miles balances */}
      <Card className="bg-[#141C2F] border-[#1E293B]">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-400" />
            Saldo de Milhas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {user.milesBalances.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">
              Usuário não cadastrou nenhum saldo.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-800/30 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-4 py-2 text-left">Programa</th>
                  <th className="px-4 py-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {user.milesBalances.map((b) => (
                  <tr key={b.program.slug}>
                    <td className="px-4 py-3 text-white">{b.program.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-300">
                      {b.balance.toLocaleString('pt-BR')} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Counts resumo */}
      <Card className="bg-[#141C2F] border-[#1E293B]">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Números rápidos
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
          <KV label="Reports totais" value={user._count.bonusReports} />
          <KV label="Aprovados" value={stats.reportsApproved} color="text-emerald-400" />
          <KV label="Rejeitados" value={stats.reportsRejected} color="text-red-400" />
          <KV label="Alertas" value={user._count.alerts} />
          <KV label="Ofertas salvas" value={user._count.savedOffers} />
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: any
  label: string
  value: string | number
  sublabel?: string
  color: string
}) {
  return (
    <div className="rounded-lg border border-[#1E293B] bg-[#141C2F] p-4">
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Icon className={`h-3 w-3 ${color}`} />
        {label}
      </div>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
      {sublabel && <p className="mt-1 text-[11px] text-gray-500">{sublabel}</p>}
    </div>
  )
}

function KV({ label, value, color = 'text-white' }: { label: string; value: any; color?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}
