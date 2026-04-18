'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Eye, ChevronDown } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { DataTable, Column } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { getUsers, getUserById, updateUserPlan } from '@/lib/api'
import { formatDate, formatDateTime, getInitials } from '@/lib/utils'
import type { User, SubscriptionPlan } from '@/types'

const planColors: Record<string, string> = {
  FREE: 'border-gray-500/30 text-gray-400 bg-gray-500/10',
  PREMIUM: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
  PRO: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
}

const LIMIT = 10

interface UserDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string | null
}

function UserDetailDialog({ open, onOpenChange, userId }: UserDetailDialogProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !userId) return
    setLoading(true)
    getUserById(userId)
      .then((res) => {
        setUser(res.data?.data ?? res.data)
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [open, userId])

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-[#141C2F] border-[#1E293B]">
        <DialogHeader>
          <DialogTitle className="text-white">Detalhes do Usuário</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-gray-400">Carregando...</div>
        ) : !user ? (
          <div className="py-8 text-center text-gray-400">Erro ao carregar usuário.</div>
        ) : (
          <div className="space-y-4">
            {/* Avatar + basic info */}
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={user.avatarUrl ?? ''} />
                <AvatarFallback className="text-base bg-indigo-600/30 text-indigo-300">
                  {getInitials(user.name ?? 'U')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-semibold text-lg">{user.name}</p>
                <p className="text-gray-400 text-sm">{user.email}</p>
                <Badge
                  variant="outline"
                  className={`mt-1 ${planColors[user.subscriptionPlan]}`}
                >
                  {user.subscriptionPlan}
                </Badge>
              </div>
            </div>

            <Separator className="bg-gray-700" />

            {/* Subscription */}
            <div className="space-y-2">
              <p className="text-gray-400 text-xs uppercase tracking-wider font-medium">Assinatura</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-gray-400">Plano</span>
                <span className="text-white">{user.subscriptionPlan}</span>
                <span className="text-gray-400">Expira em</span>
                <span className="text-white">{formatDate(user.subscriptionExpiresAt)}</span>
                <span className="text-gray-400">Membro desde</span>
                <span className="text-white">{formatDate(user.createdAt)}</span>
              </div>
            </div>

            <Separator className="bg-gray-700" />

            {/* Miles balance */}
            {user.milesBalance && Object.keys(user.milesBalance).length > 0 && (
              <>
                <div className="space-y-2">
                  <p className="text-gray-400 text-xs uppercase tracking-wider font-medium">
                    Saldo de Milhas
                  </p>
                  <div className="space-y-1">
                    {Object.entries(user.milesBalance).map(([program, balance]) => (
                      <div key={program} className="flex justify-between text-sm">
                        <span className="text-gray-400">{program}</span>
                        <span className="text-white">{balance.toLocaleString('pt-BR')}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator className="bg-gray-700" />
              </>
            )}

            {/* Alerts */}
            <div className="space-y-2">
              <p className="text-gray-400 text-xs uppercase tracking-wider font-medium">Alertas</p>
              <div className="text-sm">
                <span className="text-gray-400">Total de alertas cadastrados: </span>
                <span className="text-white">{user.alertsCount ?? 0}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function UsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('ALL')

  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit: LIMIT }
      if (search) params.search = search
      if (planFilter !== 'ALL') params.plan = planFilter

      const res = await getUsers(params)
      const data = res.data?.data ?? res.data ?? []
      const total = res.data?.totalPages ?? 1
      setUsers(Array.isArray(data) ? data : [])
      setTotalPages(total)
    } catch {
      toast({ title: 'Erro ao carregar usuários', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, search, planFilter, toast])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleChangePlan = async (userId: string, plan: SubscriptionPlan) => {
    try {
      await updateUserPlan(userId, plan)
      toast({ title: `Plano alterado para ${plan}` })
      fetchUsers()
    } catch {
      toast({ title: 'Erro ao alterar plano', variant: 'destructive' })
    }
  }

  const columns: Column<User>[] = [
    {
      key: 'avatar',
      header: '',
      cell: (row) => (
        <Avatar className="h-8 w-8">
          <AvatarImage src={row.avatarUrl ?? ''} />
          <AvatarFallback className="text-xs bg-indigo-600/30 text-indigo-300">
            {getInitials(row.name ?? 'U')}
          </AvatarFallback>
        </Avatar>
      ),
      className: 'w-10',
    },
    {
      key: 'name',
      header: 'Nome',
      cell: (row) => <span className="text-white font-medium">{row.name}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      cell: (row) => <span className="text-gray-400 text-sm">{row.email}</span>,
    },
    {
      key: 'plan',
      header: 'Plano',
      cell: (row) => (
        <Badge variant="outline" className={planColors[row.subscriptionPlan]}>
          {row.subscriptionPlan}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Criado em',
      cell: (row) => (
        <span className="text-gray-400 text-sm">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
            onClick={() => {
              setSelectedUserId(row.id)
              setDetailOpen(true)
            }}
            title="Ver detalhes"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-gray-400 hover:text-white hover:bg-gray-700 gap-1 text-xs"
              >
                Alterar plano
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#141C2F] border-[#1E293B]" align="end">
              {(['FREE', 'PREMIUM', 'PRO'] as SubscriptionPlan[]).map((plan) => (
                <DropdownMenuItem
                  key={plan}
                  className={`text-white hover:bg-gray-700 cursor-pointer ${
                    row.subscriptionPlan === plan ? 'opacity-50 pointer-events-none' : ''
                  }`}
                  onClick={() => handleChangePlan(row.id, plan)}
                >
                  {plan}
                  {row.subscriptionPlan === plan && ' (atual)'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 bg-[#0B1120]">
      <PageHeader title="Usuários" />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-56 bg-[#141C2F] border-[#1E293B] text-white placeholder:text-gray-500"
        />

        <Select
          value={planFilter}
          onValueChange={(v) => { setPlanFilter(v); setPage(1) }}
        >
          <SelectTrigger className="w-40 bg-[#141C2F] border-[#1E293B] text-white">
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent className="bg-[#141C2F] border-[#1E293B]">
            <SelectItem value="ALL" className="text-white">Todos os planos</SelectItem>
            <SelectItem value="FREE" className="text-white">FREE</SelectItem>
            <SelectItem value="PREMIUM" className="text-white">PREMIUM</SelectItem>
            <SelectItem value="PRO" className="text-white">PRO</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        keyExtractor={(row) => row.id}
        emptyMessage="Nenhum usuário encontrado."
      />

      <UserDetailDialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setSelectedUserId(null)
        }}
        userId={selectedUserId}
      />
    </div>
  )
}
