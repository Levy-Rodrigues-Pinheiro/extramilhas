'use client'

import React, { useState, useEffect } from 'react'
import { Send, Bell } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/page-header'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/loading-spinner'
import { useToast } from '@/hooks/use-toast'
import { sendNotification } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'

const notifSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  body: z.string().min(1, 'Mensagem é obrigatória'),
  target: z.enum(['ALL', 'FREE', 'PREMIUM', 'PRO']),
})

type NotifFormValues = z.infer<typeof notifSchema>

const targetLabels: Record<string, string> = {
  ALL: 'Todos',
  FREE: 'Apenas Gratuitos',
  PREMIUM: 'Apenas Premium',
  PRO: 'Apenas Pro',
}

interface HistoryEntry {
  id: string
  title: string
  body: string
  target: string
  sentAt: string
  status: 'sent' | 'error'
}

const STORAGE_KEY = 'milhasextras_notif_history'

function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(entries: HistoryEntry[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export default function NotificationsPage() {
  const { toast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [pendingValues, setPendingValues] = useState<NotifFormValues | null>(null)

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    formState: { errors },
  } = useForm<NotifFormValues>({
    resolver: zodResolver(notifSchema),
    defaultValues: {
      title: '',
      body: '',
      target: 'ALL',
    },
  })

  const onFormSubmit = (values: NotifFormValues) => {
    setPendingValues(values)
    setConfirmOpen(true)
  }

  const handleConfirmSend = async () => {
    if (!pendingValues) return
    setSending(true)
    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      title: pendingValues.title,
      body: pendingValues.body,
      target: pendingValues.target,
      sentAt: new Date().toISOString(),
      status: 'sent',
    }

    try {
      await sendNotification({
        title: pendingValues.title,
        body: pendingValues.body,
        target: pendingValues.target,
      })
      newEntry.status = 'sent'
      toast({ title: 'Notificação enviada com sucesso!' })
    } catch {
      newEntry.status = 'error'
      toast({
        title: 'Erro ao enviar notificação',
        description: 'A notificação foi salva no histórico como falha.',
        variant: 'destructive',
      })
    } finally {
      const updatedHistory = [newEntry, ...history].slice(0, 50)
      setHistory(updatedHistory)
      saveHistory(updatedHistory)
      setSending(false)
      setConfirmOpen(false)
      setPendingValues(null)
      reset()
    }
  }

  return (
    <div className="space-y-6 bg-[#0B1120]">
      <PageHeader title="Notificações Push" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Send form */}
        <Card className="bg-[#141C2F] border-[#1E293B]">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Enviar Notificação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-gray-300">Título *</Label>
                <Input
                  {...register('title')}
                  placeholder="Título da notificação"
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
                />
                {errors.title && (
                  <p className="text-xs text-red-400">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-gray-300">Mensagem *</Label>
                <Textarea
                  {...register('body')}
                  placeholder="Conteúdo da notificação..."
                  rows={4}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 resize-none"
                />
                {errors.body && (
                  <p className="text-xs text-red-400">{errors.body.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-gray-300">Destinatários</Label>
                <Controller
                  control={control}
                  name="target"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Selecione os destinatários" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141C2F] border-[#1E293B]">
                        <SelectItem value="ALL" className="text-white">Todos</SelectItem>
                        <SelectItem value="FREE" className="text-white">Apenas Gratuitos</SelectItem>
                        <SelectItem value="PREMIUM" className="text-white">Apenas Premium</SelectItem>
                        <SelectItem value="PRO" className="text-white">Apenas Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 gap-2"
              >
                <Send className="h-4 w-4" />
                Enviar Notificação
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Notification preview */}
        <Card className="bg-[#141C2F] border-[#1E293B]">
          <CardHeader>
            <CardTitle className="text-white text-base">Pré-visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl bg-gray-700 border border-gray-600 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Milhas Extras · agora</p>
                </div>
              </div>
              <p className="text-white font-semibold text-sm">
                {getValues('title') || 'Título da notificação'}
              </p>
              <p className="text-gray-300 text-sm leading-relaxed">
                {getValues('body') || 'Conteúdo da sua notificação aparecerá aqui...'}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Esta é apenas uma pré-visualização aproximada.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* History table */}
      <Card className="bg-[#141C2F] border-[#1E293B]">
        <CardHeader>
          <CardTitle className="text-white text-base">Histórico de Envios</CardTitle>
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
                    Destinatário
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Enviado em
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-gray-500 text-sm">
                      Nenhuma notificação enviada ainda.
                    </td>
                  </tr>
                ) : (
                  history.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium truncate max-w-[200px]">
                          {entry.title}
                        </p>
                        <p className="text-gray-500 text-xs truncate max-w-[200px]">
                          {entry.body}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {targetLabels[entry.target] ?? entry.target}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {formatDateTime(entry.sentAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            entry.status === 'sent'
                              ? 'border-green-500/30 text-green-400 bg-green-500/10'
                              : 'border-red-500/30 text-red-400 bg-red-500/10'
                          }
                        >
                          {entry.status === 'sent' ? 'Enviado' : 'Erro'}
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

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmar envio"
        description={
          pendingValues
            ? `Você está prestes a enviar a notificação "${pendingValues.title}" para: ${targetLabels[pendingValues.target]}. Deseja continuar?`
            : 'Confirmar envio da notificação?'
        }
        confirmLabel="Enviar"
        cancelLabel="Cancelar"
        variant="default"
        loading={sending}
        onConfirm={handleConfirmSend}
      />
    </div>
  )
}
