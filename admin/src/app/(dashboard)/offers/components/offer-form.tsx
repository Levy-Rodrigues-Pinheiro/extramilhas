'use client'

import React, { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { LoadingSpinner } from '@/components/loading-spinner'
import { useToast } from '@/hooks/use-toast'
import { createOffer, updateOffer, getPrograms } from '@/lib/api'
import type { Offer, LoyaltyProgram } from '@/types'

const offerSchema = z.object({
  programId: z.string().min(1, 'Selecione um programa'),
  type: z.enum(['PURCHASE', 'TRANSFER_BONUS', 'AWARD_DISCOUNT', 'PROMO']),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  cpm: z.coerce.number().min(0, 'CPM deve ser maior ou igual a 0'),
  classification: z.enum(['IMPERDIVEL', 'BOA', 'NORMAL']),
  sourceUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  affiliateUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean(),
})

type OfferFormValues = z.infer<typeof offerSchema>

interface OfferFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  offer?: Offer | null
  onSuccess: () => void
}

const typeOptions = [
  { value: 'PURCHASE', label: 'Compra' },
  { value: 'TRANSFER_BONUS', label: 'Transf. Bonificada' },
  { value: 'AWARD_DISCOUNT', label: 'Passagem' },
  { value: 'PROMO', label: 'Promoção' },
]

const classificationOptions = [
  { value: 'IMPERDIVEL', label: 'Imperdível' },
  { value: 'BOA', label: 'Boa' },
  { value: 'NORMAL', label: 'Normal' },
]

function getCpmClassification(cpm: number): 'IMPERDIVEL' | 'BOA' | 'NORMAL' {
  if (cpm < 20) return 'IMPERDIVEL'
  if (cpm <= 30) return 'BOA'
  return 'NORMAL'
}

function toDateInputValue(isoString?: string): string {
  if (!isoString) return ''
  return isoString.slice(0, 10)
}

export function OfferFormDialog({ open, onOpenChange, offer, onSuccess }: OfferFormDialogProps) {
  const { toast } = useToast()
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([])
  const [loadingPrograms, setLoadingPrograms] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<OfferFormValues>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      programId: '',
      type: 'PURCHASE',
      title: '',
      description: '',
      cpm: 0,
      classification: 'NORMAL',
      sourceUrl: '',
      affiliateUrl: '',
      startsAt: '',
      expiresAt: '',
      isActive: true,
    },
  })

  const cpmValue = watch('cpm')

  // Auto-set classification based on CPM
  useEffect(() => {
    const numericCpm = Number(cpmValue)
    if (!isNaN(numericCpm)) {
      setValue('classification', getCpmClassification(numericCpm))
    }
  }, [cpmValue, setValue])

  // Load programs
  useEffect(() => {
    if (!open) return
    setLoadingPrograms(true)
    getPrograms()
      .then((res) => {
        const data = res.data?.data ?? res.data ?? []
        setPrograms(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        setPrograms([])
      })
      .finally(() => setLoadingPrograms(false))
  }, [open])

  // Populate form when editing
  useEffect(() => {
    if (open && offer) {
      reset({
        programId: offer.programId,
        type: offer.type,
        title: offer.title,
        description: offer.description ?? '',
        cpm: offer.cpm,
        classification: offer.classification,
        sourceUrl: offer.sourceUrl ?? '',
        affiliateUrl: offer.affiliateUrl ?? '',
        startsAt: toDateInputValue(offer.startsAt),
        expiresAt: toDateInputValue(offer.expiresAt),
        isActive: offer.isActive,
      })
    } else if (open && !offer) {
      reset({
        programId: '',
        type: 'PURCHASE',
        title: '',
        description: '',
        cpm: 0,
        classification: 'NORMAL',
        sourceUrl: '',
        affiliateUrl: '',
        startsAt: '',
        expiresAt: '',
        isActive: true,
      })
    }
  }, [open, offer, reset])

  const onSubmit = async (values: OfferFormValues) => {
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        ...values,
        cpm: Number(values.cpm),
        startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : undefined,
        expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
        sourceUrl: values.sourceUrl || undefined,
        affiliateUrl: values.affiliateUrl || undefined,
        description: values.description || undefined,
      }

      if (offer) {
        await updateOffer(offer.id, payload)
        toast({ title: 'Oferta atualizada com sucesso!' })
      } else {
        await createOffer(payload)
        toast({ title: 'Oferta criada com sucesso!' })
      }
      onSuccess()
      onOpenChange(false)
    } catch {
      toast({
        title: offer ? 'Erro ao atualizar oferta' : 'Erro ao criar oferta',
        description: 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#141C2F] border-[#1E293B]">
        <DialogHeader>
          <DialogTitle className="text-white">
            {offer ? 'Editar Oferta' : 'Nova Oferta'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Program */}
          <div className="space-y-1">
            <Label className="text-gray-300">Programa *</Label>
            <Controller
              control={control}
              name="programId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={loadingPrograms}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder={loadingPrograms ? 'Carregando...' : 'Selecione um programa'} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141C2F] border-[#1E293B]">
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-white hover:bg-gray-700">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.programId && (
              <p className="text-xs text-red-400">{errors.programId.message}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-1">
            <Label className="text-gray-300">Tipo *</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141C2F] border-[#1E293B]">
                    {typeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-gray-700">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Title */}
          <div className="space-y-1">
            <Label className="text-gray-300">Título *</Label>
            <Input
              {...register('title')}
              placeholder="Título da oferta"
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
            />
            {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-gray-300">Descrição</Label>
            <Textarea
              {...register('description')}
              placeholder="Descrição da oferta (opcional)"
              rows={3}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 resize-none"
            />
          </div>

          {/* CPM + Classification */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-gray-300">CPM (R$) *</Label>
              <Input
                {...register('cpm')}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
              />
              {errors.cpm && <p className="text-xs text-red-400">{errors.cpm.message}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300">Classificação *</Label>
              <Controller
                control={control}
                name="classification"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141C2F] border-[#1E293B]">
                      {classificationOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-gray-700">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* URLs */}
          <div className="space-y-1">
            <Label className="text-gray-300">URL da Fonte</Label>
            <Input
              {...register('sourceUrl')}
              placeholder="https://..."
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
            />
            {errors.sourceUrl && (
              <p className="text-xs text-red-400">{errors.sourceUrl.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-gray-300">URL Afiliado</Label>
            <Input
              {...register('affiliateUrl')}
              placeholder="https://..."
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
            />
            {errors.affiliateUrl && (
              <p className="text-xs text-red-400">{errors.affiliateUrl.message}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-gray-300">Início</Label>
              <Input
                {...register('startsAt')}
                type="date"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300">Expiração</Label>
              <Input
                {...register('expiresAt')}
                type="date"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          {/* Is Active */}
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  id="isActive"
                />
              )}
            />
            <Label htmlFor="isActive" className="text-gray-300 cursor-pointer">
              Ativa
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
            <Button type="submit" disabled={submitting} className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 gap-2">
              {submitting && <LoadingSpinner size="sm" />}
              {offer ? 'Salvar alterações' : 'Criar oferta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
