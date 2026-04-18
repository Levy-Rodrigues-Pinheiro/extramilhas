'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Globe, Lock } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/page-header'
import { DataTable, Column } from '@/components/data-table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
import { getArticles, createArticle, updateArticle, deleteArticle } from '@/lib/api'
import { formatDate, slugify } from '@/lib/utils'
import type { ContentArticle } from '@/types'

const articleSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório'),
  body: z.string().min(1, 'Conteúdo é obrigatório'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  isProOnly: z.boolean(),
  publishedAt: z.string().optional(),
})

type ArticleFormValues = z.infer<typeof articleSchema>

function toDateInputValue(isoString?: string | null): string {
  if (!isoString) return ''
  return isoString.slice(0, 10)
}

interface ArticleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  article?: ContentArticle | null
  onSuccess: () => void
}

function ArticleFormDialog({ open, onOpenChange, article, onSuccess }: ArticleFormDialogProps) {
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
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: '',
      slug: '',
      body: '',
      category: '',
      isProOnly: false,
      publishedAt: '',
    },
  })

  const titleValue = watch('title')

  useEffect(() => {
    if (!article) {
      setValue('slug', slugify(titleValue ?? ''))
    }
  }, [titleValue, setValue, article])

  useEffect(() => {
    if (open && article) {
      reset({
        title: article.title,
        slug: article.slug,
        body: article.body,
        category: article.category,
        isProOnly: article.isProOnly,
        publishedAt: toDateInputValue(article.publishedAt),
      })
    } else if (open && !article) {
      reset({
        title: '',
        slug: '',
        body: '',
        category: '',
        isProOnly: false,
        publishedAt: '',
      })
    }
  }, [open, article, reset])

  const onSubmit = async (values: ArticleFormValues) => {
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        ...values,
        publishedAt: values.publishedAt
          ? new Date(values.publishedAt).toISOString()
          : null,
      }

      if (article) {
        await updateArticle(article.id, payload)
        toast({ title: 'Artigo atualizado com sucesso!' })
      } else {
        await createArticle(payload)
        toast({ title: 'Artigo criado com sucesso!' })
      }
      onSuccess()
      onOpenChange(false)
    } catch {
      toast({
        title: article ? 'Erro ao atualizar artigo' : 'Erro ao criar artigo',
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
            {article ? 'Editar Artigo' : 'Novo Artigo'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-gray-300">Título *</Label>
            <Input
              {...register('title')}
              placeholder="Título do artigo"
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
            />
            {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-gray-300">Slug *</Label>
            <Input
              {...register('slug')}
              placeholder="slug-do-artigo"
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 font-mono"
            />
            {errors.slug && <p className="text-xs text-red-400">{errors.slug.message}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-gray-300">Categoria *</Label>
            <Input
              {...register('category')}
              placeholder="Ex: Dicas, Transferências, Promoções..."
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
            />
            {errors.category && (
              <p className="text-xs text-red-400">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-gray-300">Conteúdo (Markdown) *</Label>
            <Textarea
              {...register('body')}
              placeholder="Conteúdo do artigo em Markdown..."
              rows={10}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 resize-y font-mono text-sm"
            />
            {errors.body && <p className="text-xs text-red-400">{errors.body.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4 items-start">
            <div className="space-y-1">
              <Label className="text-gray-300">Data de Publicação</Label>
              <Input
                {...register('publishedAt')}
                type="date"
                className="bg-gray-700 border-gray-600 text-white"
              />
              <p className="text-xs text-gray-500">Deixe em branco para salvar como rascunho.</p>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Controller
                control={control}
                name="isProOnly"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="isProOnly"
                  />
                )}
              />
              <Label htmlFor="isProOnly" className="text-gray-300 cursor-pointer">
                Somente PRO
              </Label>
            </div>
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
              {article ? 'Salvar alterações' : 'Criar artigo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const LIMIT = 10

export default function ArticlesPage() {
  const { toast } = useToast()
  const [articles, setArticles] = useState<ContentArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<ContentArticle | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingArticle, setDeletingArticle] = useState<ContentArticle | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getArticles({ page, limit: LIMIT })
      const data = res.data?.data ?? res.data ?? []
      const total = res.data?.totalPages ?? 1
      setArticles(Array.isArray(data) ? data : [])
      setTotalPages(total)
    } catch {
      toast({ title: 'Erro ao carregar artigos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, toast])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  const handleTogglePublished = async (article: ContentArticle) => {
    try {
      const publishedAt = article.publishedAt ? null : new Date().toISOString()
      await updateArticle(article.id, { publishedAt })
      setArticles((prev) =>
        prev.map((a) =>
          a.id === article.id ? { ...a, publishedAt: publishedAt ?? undefined } : a
        )
      )
      toast({
        title: publishedAt ? 'Artigo publicado' : 'Artigo despublicado',
      })
    } catch {
      toast({ title: 'Erro ao alterar status de publicação', variant: 'destructive' })
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingArticle) return
    setDeleting(true)
    try {
      await deleteArticle(deletingArticle.id)
      toast({ title: 'Artigo excluído com sucesso' })
      setDeleteDialogOpen(false)
      setDeletingArticle(null)
      fetchArticles()
    } catch {
      toast({ title: 'Erro ao excluir artigo', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const columns: Column<ContentArticle>[] = [
    {
      key: 'title',
      header: 'Título',
      cell: (row) => (
        <span className="text-white font-medium truncate block max-w-[240px]">{row.title}</span>
      ),
    },
    {
      key: 'category',
      header: 'Categoria',
      cell: (row) => (
        <span className="text-gray-300 text-sm">{row.category}</span>
      ),
    },
    {
      key: 'isProOnly',
      header: 'Acesso',
      cell: (row) => (
        <Badge
          variant="outline"
          className={
            row.isProOnly
              ? 'border-purple-500/30 text-purple-400 bg-purple-500/10 gap-1'
              : 'border-gray-500/30 text-gray-400 bg-gray-500/10 gap-1'
          }
        >
          {row.isProOnly ? (
            <>
              <Lock className="h-3 w-3" />
              PRO
            </>
          ) : (
            <>
              <Globe className="h-3 w-3" />
              Público
            </>
          )}
        </Badge>
      ),
    },
    {
      key: 'publishedAt',
      header: 'Publicação',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={!!row.publishedAt}
            onCheckedChange={() => handleTogglePublished(row)}
            aria-label="Toggle publicado"
          />
          <span className="text-gray-400 text-sm">
            {row.publishedAt ? formatDate(row.publishedAt) : 'Rascunho'}
          </span>
        </div>
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
              setEditingArticle(row)
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
              setDeletingArticle(row)
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
        title="Artigos e Conteúdo"
        action={
          <Button
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 gap-2"
            onClick={() => {
              setEditingArticle(null)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Novo Artigo
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={articles}
        loading={loading}
        totalPages={totalPages}
        currentPage={page}
        onPageChange={setPage}
        keyExtractor={(row) => row.id}
        emptyMessage="Nenhum artigo encontrado."
      />

      <ArticleFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingArticle(null)
        }}
        article={editingArticle}
        onSuccess={fetchArticles}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) setDeletingArticle(null)
        }}
        title="Excluir artigo"
        description={`Tem certeza que deseja excluir "${deletingArticle?.title}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
