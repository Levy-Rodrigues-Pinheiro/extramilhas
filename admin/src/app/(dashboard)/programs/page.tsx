'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/page-header'
import { DataTable, Column } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/loading-spinner'
import { useToast } from '@/hooks/use-toast'
import { getPrograms, createProgram, updateProgram, toggleProgramStatus } from '@/lib/api'
import { formatCPM, slugify } from '@/lib/utils'
import type { LoyaltyProgram } from '@/types'

const programSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório'),
  logoUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  websiteUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  avgCpmCurrent: z.coerce.number().min(0, 'CPM deve ser maior ou igual a 0'),
  isActive: z.boolean(),
})

type ProgramFormValues = z.infer<typeof programSchema>

interface ProgramFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  program?: LoyaltyProgram | null
  onSuccess: () => void
}

function ProgramFormDialog({ open, onOpenChange, program, onSuccess }: ProgramFormDialogProps) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: '',
      slug: '',
      logoUrl: '',
      websiteUrl: '',
      avgCpmCurrent: 0,
      isActive: true,
    },
  })

  const nameValue = watch('name')

  useEffect(() => {
    if (!program) {
      setValue('slug', slugify(nameValue ?? ''))
    }
  }, [nameValue, setValue, program])

  useEffect(() => {
    if (open && program) {
      reset({
        name: program.name,
        slug: program.slug,
        logoUrl: program.logoUrl ?? '',
        websiteUrl: program.websiteUrl ?? '',
        avgCpmCurrent: program.avgCpmCurrent ?? 0,
        isActive: program.isActive,
      })
    } else if (open && !program) {
      reset({
        name: '',
        slug: '',
        logoUrl: '',
        websiteUrl: '',
        avgCpmCurrent: 0,
        isActive: true,
      })
    }
  }, [open, program, reset])

  const onSubmit = async (values: ProgramFormValues) => {
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        ...values,
        avgCpmCurrent: Number(values.avgCpmCurrent),
        logoUrl: values.logoUrl || undefined,
        websiteUrl: values.websiteUrl || undefined,
      }

      if (program) {
        await updateProgram(program.id, payload)
        toast({ title: 'Programa atualizado com sucesso!' })
      } else {
        await createProgram(payload)
        toast({ title: 'Programa criado com sucesso!' })
      }
      onSuccess()
      onOpenChange(false)
    } catch {
      toast({
        title: program ? 'Erro ao atualizar programa' : 'Erro ao criar programa',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#141C2F] border-[#1E293B]">
        <DialogHeader>
          <DialogTitle className="text-white">
            {program ? 'Editar Programa' : 'Novo Programa'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-gray-300">Nome *</Label>
            <Input
              {...register('name')}
              placeholder="Nome do programa"
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
            />
            {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-gray-300">Slug *</Label>
            <Input
              {...register('slug')}
              placeholder="slug-do-programa"
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
            />
            {errors.slug && <p className="text-xs text-red-400">{errors.slug.message}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-gray-300">URL do Logo</Label>
            <Input
              {...register('logoUrl')}
              placeholder="https://..."
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
            />
            {errors.logoUrl && <p className="text-xs text-red-400">{errors.logoUrl.message}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-gray-300">Website</Label>
            <Input
              {...register('websiteUrl')}
              placeholder="https://..."
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
            />
            {errors.websiteUrl && (
              <p className="text-xs text-red-400">{errors.websiteUrl.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-gray-300">CPM Médio Atual (R$) *</Label>
            <Input
              {...register('avgCpmCurrent')}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
            />
            {errors.avgCpmCurrent && (
              <p className="text-xs text-red-400">{errors.avgCpmCurrent.message}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} id="prog-isActive" />
              )}
            />
            <Label htmlFor="prog-isActive" className="text-gray-300 cursor-pointer">
              Ativo
            </Label>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 gap-2"
            >
              {submitting && <LoadingSpinner size="sm" />}
              {program ? 'Salvar alterações' : 'Criar programa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function ProgramsPage() {
  const { toast } = useToast()
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<LoyaltyProgram | null>(null)

  const fetchPrograms = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPrograms({ page, limit: 10 })
      const data = res.data?.data ?? res.data ?? []
      const total = res.data?.totalPages ?? 1
      setPrograms(Array.isArray(data) ? data : [])
      setTotalPages(total)
    } catch {
      toast({ title: 'Erro ao carregar programas', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, toast])

  useEffect(() => {
    fetchPrograms()
  }, [fetchPrograms])

  const handleToggle = async (program: LoyaltyProgram) => {
    try {
      await toggleProgramStatus(program.id)
      setPrograms((prev) =>
        prev.map((p) => (p.id === program.id ? { ...p, isActive: !p.isActive } : p))
      )
      toast({ title: `Programa ${!program.isActive ? 'ativado' : 'desativado'}` })
    } catch {
      toast({ title: 'Erro ao alterar status', variant: 'destructive' })
    }
  }

  const columns: Column<LoyaltyProgram>[] = [
    {
      key: 'logo',
      header: 'Logo',
      cell: (row) => (
        <div className="flex items-center justify-center h-9 w-9 rounded-full bg-indigo-600/20 text-indigo-300 font-bold text-sm">
          {row.name.slice(0, 2).toUpperCase()}
        </div>
      ),
      className: 'w-12',
    },
    {
      key: 'name',
      header: 'Nome',
      cell: (row) => <span className="text-white font-medium">{row.name}</span>,
    },
    {
      key: 'slug',
      header: 'Slug',
      cell: (row) => <span className="text-gray-400 text-sm font-mono">{row.slug}</span>,
    },
    {
      key: 'avgCpmCurrent',
      header: 'CPM Médio',
      cell: (row) => (
        <span className="text-gray-300 text-sm">
          {row.avgCpmCurrent != null ? formatCPM(row.avgCpmCurrent) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge
          variant="outline"
          className={
            row.isActive
              ? 'border-green-500/30 text-green-400 bg-green-500/10'
              : 'border-gray-500/30 text-gray-400 bg-gray-500/10'
          }
        >
          {row.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.isActive}
            onCheckedChange={() => handleToggle(row)}
            aria-label="Toggle ativo"
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
            onClick={() => {
              setEditingProgram(row)
              setFormOpen(true)
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 bg-[#0B1120]">
      <PageHeader
        title="Programas de Fidelidade"
        action={
          <Button
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 gap-2"
            onClick={() => {
              setEditingProgram(null)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Novo Programa
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={programs}
        loading={loading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        keyExtractor={(row) => row.id}
        emptyMessage="Nenhum programa encontrado."
      />

      <ProgramFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingProgram(null)
        }}
        program={editingProgram}
        onSuccess={fetchPrograms}
      />
    </div>
  )
}
