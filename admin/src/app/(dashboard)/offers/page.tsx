'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { DataTable, Column } from '@/components/data-table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OfferFormDialog } from './components/offer-form'
import { useToast } from '@/hooks/use-toast'
import { getOffers, deleteOffer, updateOffer, getPrograms } from '@/lib/api'
import { formatDate, formatCPM } from '@/lib/utils'
import type { Offer, LoyaltyProgram } from '@/types'

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

const typeLabels: Record<string, string> = {
  PURCHASE: 'Compra',
  TRANSFER_BONUS: 'Transf. Bonificada',
  AWARD_DISCOUNT: 'Passagem',
  PROMO: 'Promoção',
}

const LIMIT = 10

export default function OffersPage() {
  const { toast } = useToast()
  const [offers, setOffers] = useState<Offer[]>([])
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [search, setSearch] = useState('')
  const [programFilter, setProgramFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [classificationFilter, setClassificationFilter] = useState('ALL')
  const [activeFilter, setActiveFilter] = useState('ALL')

  const [formOpen, setFormOpen] = useState(false)
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingOffer, setDeletingOffer] = useState<Offer | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchOffers = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit: LIMIT }
      if (search) params.search = search
      if (programFilter !== 'ALL') params.programId = programFilter
      if (typeFilter !== 'ALL') params.type = typeFilter
      if (classificationFilter !== 'ALL') params.classification = classificationFilter
      if (activeFilter !== 'ALL') params.isActive = activeFilter === 'true'

      const res = await getOffers(params)
      const data = res.data?.data ?? res.data ?? []
      const total = res.data?.totalPages ?? 1
      setOffers(Array.isArray(data) ? data : [])
      setTotalPages(total)
    } catch {
      toast({ title: 'Erro ao carregar ofertas', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, search, programFilter, typeFilter, classificationFilter, activeFilter, toast])

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  useEffect(() => {
    getPrograms()
      .then((res) => {
        const data = res.data?.data ?? res.data ?? []
        setPrograms(Array.isArray(data) ? data : [])
      })
      .catch(() => setPrograms([]))
  }, [])

  const handleToggleActive = async (offer: Offer) => {
    try {
      await updateOffer(offer.id, { isActive: !offer.isActive })
      setOffers((prev) =>
        prev.map((o) => (o.id === offer.id ? { ...o, isActive: !o.isActive } : o))
      )
      toast({ title: `Oferta ${!offer.isActive ? 'ativada' : 'desativada'}` })
    } catch {
      toast({ title: 'Erro ao atualizar oferta', variant: 'destructive' })
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingOffer) return
    setDeleting(true)
    try {
      await deleteOffer(deletingOffer.id)
      toast({ title: 'Oferta excluída com sucesso' })
      setDeleteDialogOpen(false)
      setDeletingOffer(null)
      fetchOffers()
    } catch {
      toast({ title: 'Erro ao excluir oferta', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const columns: Column<Offer>[] = [
    {
      key: 'title',
      header: 'Título',
      cell: (row) => (
        <span className="text-white font-medium truncate block max-w-[180px]">{row.title}</span>
      ),
    },
    {
      key: 'program',
      header: 'Programa',
      cell: (row) => (
        <span className="text-gray-300 text-sm">
          {row.program?.name ?? programs.find((p) => p.id === row.programId)?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      cell: (row) => (
        <span className="text-gray-300 text-sm">{typeLabels[row.type] ?? row.type}</span>
      ),
    },
    {
      key: 'cpm',
      header: 'CPM',
      cell: (row) => <span className="text-gray-300 text-sm">{formatCPM(row.cpm)}</span>,
    },
    {
      key: 'classification',
      header: 'Classificação',
      cell: (row) => (
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${classificationColors[row.classification] ?? ''}`}
        >
          {classificationLabels[row.classification] ?? row.classification}
        </span>
      ),
    },
    {
      key: 'expiresAt',
      header: 'Expiração',
      cell: (row) => (
        <span className="text-gray-400 text-sm">{formatDate(row.expiresAt)}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Ativo',
      cell: (row) => (
        <Switch
          checked={row.isActive}
          onCheckedChange={() => handleToggleActive(row)}
          aria-label="Toggle ativo"
        />
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
              setEditingOffer(row)
              setFormOpen(true)
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-900/20"
            onClick={() => {
              setDeletingOffer(row)
              setDeleteDialogOpen(true)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 bg-[#0B1120]">
      <PageHeader
        title="Ofertas"
        action={
          <Button
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 gap-2"
            onClick={() => {
              setEditingOffer(null)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Nova Oferta
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar ofertas..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-48 bg-[#141C2F] border-[#1E293B] text-white placeholder:text-gray-500"
        />

        <Select
          value={programFilter}
          onValueChange={(v) => { setProgramFilter(v); setPage(1) }}
        >
          <SelectTrigger className="w-44 bg-[#141C2F] border-[#1E293B] text-white">
            <SelectValue placeholder="Programa" />
          </SelectTrigger>
          <SelectContent className="bg-[#141C2F] border-[#1E293B]">
            <SelectItem value="ALL" className="text-white">Todos os programas</SelectItem>
            {programs.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-white">
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={(v) => { setTypeFilter(v); setPage(1) }}
        >
          <SelectTrigger className="w-44 bg-[#141C2F] border-[#1E293B] text-white">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent className="bg-[#141C2F] border-[#1E293B]">
            <SelectItem value="ALL" className="text-white">Todos os tipos</SelectItem>
            <SelectItem value="PURCHASE" className="text-white">Compra</SelectItem>
            <SelectItem value="TRANSFER_BONUS" className="text-white">Transf. Bonificada</SelectItem>
            <SelectItem value="AWARD_DISCOUNT" className="text-white">Passagem</SelectItem>
            <SelectItem value="PROMO" className="text-white">Promoção</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={classificationFilter}
          onValueChange={(v) => { setClassificationFilter(v); setPage(1) }}
        >
          <SelectTrigger className="w-44 bg-[#141C2F] border-[#1E293B] text-white">
            <SelectValue placeholder="Classificação" />
          </SelectTrigger>
          <SelectContent className="bg-[#141C2F] border-[#1E293B]">
            <SelectItem value="ALL" className="text-white">Todas as classes</SelectItem>
            <SelectItem value="IMPERDIVEL" className="text-white">Imperdível</SelectItem>
            <SelectItem value="BOA" className="text-white">Boa</SelectItem>
            <SelectItem value="NORMAL" className="text-white">Normal</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={activeFilter}
          onValueChange={(v) => { setActiveFilter(v); setPage(1) }}
        >
          <SelectTrigger className="w-36 bg-[#141C2F] border-[#1E293B] text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#141C2F] border-[#1E293B]">
            <SelectItem value="ALL" className="text-white">Todos</SelectItem>
            <SelectItem value="true" className="text-white">Ativas</SelectItem>
            <SelectItem value="false" className="text-white">Inativas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={offers}
        loading={loading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        keyExtractor={(row) => row.id}
        emptyMessage="Nenhuma oferta encontrada."
      />

      <OfferFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingOffer(null)
        }}
        offer={editingOffer}
        onSuccess={fetchOffers}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) setDeletingOffer(null)
        }}
        title="Excluir oferta"
        description={`Tem certeza que deseja excluir "${deletingOffer?.title}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
