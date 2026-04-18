'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Check, Minus, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { DataTable, Column } from '@/components/data-table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/loading-spinner'
import { useToast } from '@/hooks/use-toast'
import {
  getAwardCharts,
  createAwardChart,
  updateAwardChart,
  deleteAwardChart,
  getPrograms,
} from '@/lib/api'
import type { LoyaltyProgram } from '@/types'

interface AwardChart {
  id: string
  programId: string
  program?: LoyaltyProgram
  origin: string
  destination: string
  destinationName?: string
  country?: string
  cabinClass: string
  milesRequired: number
  isDirectFlight: boolean
  source?: string
  lat?: number
  lng?: number
  createdAt?: string
  updatedAt?: string
}

interface AwardChartFormValues {
  programId: string
  origin: string
  destination: string
  destinationName: string
  country: string
  cabinClass: string
  milesRequired: number
  isDirectFlight: boolean
  source: string
  lat: string
  lng: string
}

const EMPTY_FORM: AwardChartFormValues = {
  programId: '',
  origin: '',
  destination: '',
  destinationName: '',
  country: '',
  cabinClass: 'economy',
  milesRequired: 0,
  isDirectFlight: false,
  source: 'manual',
  lat: '',
  lng: '',
}

const cabinClassLabels: Record<string, string> = {
  economy: 'Econômica',
  business: 'Executiva',
  first: 'Primeira',
}

const LIMIT = 10

export default function AwardChartsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<AwardChart[]>([])
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [programFilter, setProgramFilter] = useState('ALL')
  const [classFilter, setClassFilter] = useState('ALL')
  const [originFilter, setOriginFilter] = useState('')

  // Form dialog
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AwardChart | null>(null)
  const [form, setForm] = useState<AwardChartFormValues>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<AwardChart | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Load programs once
  useEffect(() => {
    getPrograms()
      .then((res) => {
        const data = res.data?.data ?? res.data ?? []
        setPrograms(Array.isArray(data) ? data : [])
      })
      .catch(() => setPrograms([]))
  }, [])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit: LIMIT }
      if (programFilter !== 'ALL') params.programId = programFilter
      if (classFilter !== 'ALL') params.cabinClass = classFilter
      if (originFilter.trim()) params.origin = originFilter.trim()

      const res = await getAwardCharts(params)
      const data = res.data?.data ?? res.data ?? []
      const total = res.data?.totalPages ?? 1
      setItems(Array.isArray(data) ? data : [])
      setTotalPages(total)
    } catch {
      toast({ title: 'Erro ao carregar tabela de resgate', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, programFilter, classFilter, originFilter, toast])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Form helpers
  const openCreateForm = () => {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setFormOpen(true)
  }

  const openEditForm = (item: AwardChart) => {
    setEditingItem(item)
    setForm({
      programId: item.programId,
      origin: item.origin,
      destination: item.destination,
      destinationName: item.destinationName ?? '',
      country: item.country ?? '',
      cabinClass: item.cabinClass,
      milesRequired: item.milesRequired,
      isDirectFlight: item.isDirectFlight,
      source: item.source ?? 'manual',
      lat: item.lat != null ? String(item.lat) : '',
      lng: item.lng != null ? String(item.lng) : '',
    })
    setFormErrors({})
    setFormOpen(true)
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!form.programId) errors.programId = 'Selecione um programa'
    if (!form.origin.trim()) errors.origin = 'Origem é obrigatória'
    if (!form.destination.trim()) errors.destination = 'Destino é obrigatório'
    if (!form.milesRequired || form.milesRequired <= 0) errors.milesRequired = 'Milhas deve ser maior que 0'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        programId: form.programId,
        origin: form.origin.trim().toUpperCase(),
        destination: form.destination.trim().toUpperCase(),
        destinationName: form.destinationName.trim() || undefined,
        country: form.country.trim() || undefined,
        cabinClass: form.cabinClass,
        milesRequired: Number(form.milesRequired),
        isDirectFlight: form.isDirectFlight,
        source: form.source || 'manual',
        lat: form.lat ? Number(form.lat) : undefined,
        lng: form.lng ? Number(form.lng) : undefined,
      }

      if (editingItem) {
        await updateAwardChart(editingItem.id, payload)
        toast({ title: 'Rota atualizada com sucesso!' })
      } else {
        await createAwardChart(payload)
        toast({ title: 'Rota criada com sucesso!' })
      }
      setFormOpen(false)
      setEditingItem(null)
      fetchItems()
    } catch {
      toast({
        title: editingItem ? 'Erro ao atualizar rota' : 'Erro ao criar rota',
        description: 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return
    setDeleting(true)
    try {
      await deleteAwardChart(deletingItem.id)
      toast({ title: 'Rota excluída com sucesso' })
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      fetchItems()
    } catch {
      toast({ title: 'Erro ao excluir rota', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const getProgramName = (item: AwardChart) => {
    return item.program?.name ?? programs.find((p) => p.id === item.programId)?.name ?? '—'
  }

  const columns: Column<AwardChart>[] = [
    {
      key: 'program',
      header: 'Programa',
      cell: (row) => (
        <span className="text-gray-300 text-sm">{getProgramName(row)}</span>
      ),
    },
    {
      key: 'origin',
      header: 'Origem',
      cell: (row) => (
        <span className="text-white font-medium text-sm">{row.origin}</span>
      ),
    },
    {
      key: 'destination',
      header: 'Destino',
      cell: (row) => (
        <span className="text-white font-medium text-sm">{row.destination}</span>
      ),
    },
    {
      key: 'country',
      header: 'País',
      cell: (row) => (
        <span className="text-gray-300 text-sm">{row.country || '—'}</span>
      ),
    },
    {
      key: 'cabinClass',
      header: 'Classe',
      cell: (row) => {
        const classStyles: Record<string, string> = {
          economy: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          business: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
          first: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        }
        return (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${classStyles[row.cabinClass] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}
          >
            {cabinClassLabels[row.cabinClass] ?? row.cabinClass}
          </span>
        )
      },
    },
    {
      key: 'milesRequired',
      header: 'Milhas',
      cell: (row) => (
        <span className="text-white font-medium text-sm">
          {row.milesRequired.toLocaleString('pt-BR')}
        </span>
      ),
    },
    {
      key: 'isDirectFlight',
      header: 'Voo Direto',
      cell: (row) =>
        row.isDirectFlight ? (
          <Check className="h-4 w-4 text-green-400" />
        ) : (
          <Minus className="h-4 w-4 text-gray-500" />
        ),
    },
    {
      key: 'source',
      header: 'Fonte',
      cell: (row) => {
        const isManual = !row.source || row.source === 'manual'
        return (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
              isManual
                ? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                : 'bg-green-500/20 text-green-400 border-green-500/30'
            }`}
          >
            {isManual ? 'Manual' : 'Scraper'}
          </span>
        )
      },
    },
    {
      key: 'updatedAt',
      header: 'Última atualização',
      cell: (row) => {
        if (!row.updatedAt) return <span className="text-gray-500 text-xs">—</span>
        const date = new Date(row.updatedAt)
        const formatted = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
        const isStale = daysAgo > 30
        return (
          <span className={`text-xs ${isStale ? 'text-yellow-400' : 'text-gray-400'}`}>
            {formatted}
            {isStale && (
              <span className="block text-[10px] text-yellow-500 mt-0.5">
                {daysAgo}d atrás
              </span>
            )}
          </span>
        )
      },
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
            onClick={() => openEditForm(row)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-900/20"
            onClick={() => {
              setDeletingItem(row)
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
        title="Tabela de Resgate"
        description="Gerencie as rotas e milhas necessárias para cada programa"
        action={
          <Button
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 gap-2"
            onClick={openCreateForm}
          >
            <Plus className="h-4 w-4" />
            Adicionar Rota
          </Button>
        }
      />

      {/* Transparency: keep data updated banner */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <span className="text-sm font-semibold text-yellow-400">Manter dados atualizados</span>
        </div>
        <p className="text-xs text-gray-400">
          Os preços de milhas mudam frequentemente. Atualize regularmente verificando os valores nos sites oficiais:
          {' '}
          <a href="https://www.smiles.com.br/passagens-aereas" target="_blank" rel="noopener" className="text-blue-400 hover:underline">Smiles</a>
          {' · '}
          <a href="https://www.voeazul.com.br" target="_blank" rel="noopener" className="text-blue-400 hover:underline">TudoAzul</a>
          {' · '}
          <a href="https://www.latamairlines.com/br/pt/oferta-voos" target="_blank" rel="noopener" className="text-blue-400 hover:underline">Latam Pass</a>
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
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
          value={classFilter}
          onValueChange={(v) => { setClassFilter(v); setPage(1) }}
        >
          <SelectTrigger className="w-44 bg-[#141C2F] border-[#1E293B] text-white">
            <SelectValue placeholder="Classe" />
          </SelectTrigger>
          <SelectContent className="bg-[#141C2F] border-[#1E293B]">
            <SelectItem value="ALL" className="text-white">Todas as classes</SelectItem>
            <SelectItem value="economy" className="text-white">Econômica</SelectItem>
            <SelectItem value="business" className="text-white">Executiva</SelectItem>
            <SelectItem value="first" className="text-white">Primeira</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Filtrar por origem..."
          value={originFilter}
          onChange={(e) => {
            setOriginFilter(e.target.value)
            setPage(1)
          }}
          className="w-48 bg-[#141C2F] border-[#1E293B] text-white placeholder:text-gray-500"
        />
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        keyExtractor={(row) => row.id}
        emptyMessage="Nenhuma rota encontrada."
      />

      {/* Form Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            setEditingItem(null)
            setFormErrors({})
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#141C2F] border-[#1E293B]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingItem ? 'Editar Rota' : 'Nova Rota'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Programa */}
            <div className="space-y-1">
              <Label className="text-gray-300">Programa *</Label>
              <Select
                value={form.programId}
                onValueChange={(v) => setForm((prev) => ({ ...prev, programId: v }))}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Selecione um programa" />
                </SelectTrigger>
                <SelectContent className="bg-[#141C2F] border-[#1E293B]">
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-white hover:bg-gray-700">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.programId && (
                <p className="text-xs text-red-400">{formErrors.programId}</p>
              )}
            </div>

            {/* Origem / Destino */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-gray-300">Origem (IATA) *</Label>
                <Input
                  value={form.origin}
                  onChange={(e) => setForm((prev) => ({ ...prev, origin: e.target.value }))}
                  placeholder="GRU"
                  maxLength={3}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 uppercase"
                />
                {formErrors.origin && (
                  <p className="text-xs text-red-400">{formErrors.origin}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Destino (IATA) *</Label>
                <Input
                  value={form.destination}
                  onChange={(e) => setForm((prev) => ({ ...prev, destination: e.target.value }))}
                  placeholder="JFK"
                  maxLength={3}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 uppercase"
                />
                {formErrors.destination && (
                  <p className="text-xs text-red-400">{formErrors.destination}</p>
                )}
              </div>
            </div>

            {/* Nome do Destino / País */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-gray-300">Nome do Destino</Label>
                <Input
                  value={form.destinationName}
                  onChange={(e) => setForm((prev) => ({ ...prev, destinationName: e.target.value }))}
                  placeholder="Nova York"
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">País</Label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                  placeholder="Estados Unidos"
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Classe / Milhas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-gray-300">Classe *</Label>
                <Select
                  value={form.cabinClass}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, cabinClass: v }))}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Selecione a classe" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141C2F] border-[#1E293B]">
                    <SelectItem value="economy" className="text-white hover:bg-gray-700">Econômica</SelectItem>
                    <SelectItem value="business" className="text-white hover:bg-gray-700">Executiva</SelectItem>
                    <SelectItem value="first" className="text-white hover:bg-gray-700">Primeira</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Milhas Necessárias *</Label>
                <Input
                  type="number"
                  value={form.milesRequired || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, milesRequired: Number(e.target.value) }))}
                  placeholder="50000"
                  min={0}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
                />
                {formErrors.milesRequired && (
                  <p className="text-xs text-red-400">{formErrors.milesRequired}</p>
                )}
              </div>
            </div>

            {/* Voo direto / Fonte */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-gray-300">Voo Direto</Label>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, isDirectFlight: !prev.isDirectFlight }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      form.isDirectFlight ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transform transition-transform ${
                        form.isDirectFlight ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-300">
                    {form.isDirectFlight ? 'Sim' : 'Não'}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Fonte</Label>
                <Select
                  value={form.source}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, source: v }))}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Selecione a fonte" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141C2F] border-[#1E293B]">
                    <SelectItem value="manual" className="text-white hover:bg-gray-700">Manual</SelectItem>
                    <SelectItem value="scraper" className="text-white hover:bg-gray-700">Scraper</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lat / Lng */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-gray-300">Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={(e) => setForm((prev) => ({ ...prev, lat: e.target.value }))}
                  placeholder="-23.5505"
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={(e) => setForm((prev) => ({ ...prev, lng: e.target.value }))}
                  placeholder="-46.6333"
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={submitting}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 gap-2"
            >
              {submitting && <LoadingSpinner size="sm" />}
              {editingItem ? 'Salvar alterações' : 'Criar rota'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) setDeletingItem(null)
        }}
        title="Excluir rota"
        description={`Tem certeza que deseja excluir a rota ${deletingItem?.origin ?? ''} → ${deletingItem?.destination ?? ''}? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
