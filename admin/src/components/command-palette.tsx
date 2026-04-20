'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import {
  LayoutDashboard,
  Tag,
  Users,
  Award,
  Map,
  Megaphone,
  Bot,
  Database,
  Activity,
  History,
  FileText,
  Bell,
  Settings,
  Search,
} from 'lucide-react'

interface Command {
  label: string
  hint?: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  keywords?: string[]
}

const COMMANDS: Command[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: ['home', 'início'] },
  { label: 'Ofertas', href: '/offers', icon: Tag },
  { label: 'Usuários', href: '/users', icon: Users, keywords: ['users', 'user'] },
  { label: 'Programas', href: '/programs', icon: Award, keywords: ['livelo', 'smiles'] },
  { label: 'Tabela de Resgate', href: '/award-charts', icon: Map, keywords: ['charts', 'resgate'] },
  { label: 'Reports de Bônus', href: '/bonus-reports', icon: Megaphone, keywords: ['bonus', 'pendente'] },
  { label: 'Agentes Inteligentes', href: '/intel-agent', icon: Bot, keywords: ['agent', 'ia', 'llm'] },
  { label: 'Cache & Telemetria', href: '/cache-stats', icon: Database, keywords: ['cache'] },
  { label: 'Diagnostics', href: '/diagnostics', icon: Activity, keywords: ['debug', 'health', 'status'] },
  { label: 'Audit Logs', href: '/audit-logs', icon: History, keywords: ['logs', 'auditoria'] },
  { label: 'Artigos', href: '/articles', icon: FileText },
  { label: 'Notificações', href: '/notifications', icon: Bell, keywords: ['push', 'broadcast'] },
  { label: 'Configurações', href: '/settings', icon: Settings },
]

/**
 * CommandPalette ao estilo Vercel/Linear. Ctrl+K / Cmd+K abre, ESC fecha.
 * Busca fuzzy por label + keywords. Enter navega.
 */
export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const filtered = React.useMemo(() => {
    if (!query.trim()) return COMMANDS
    const q = query.toLowerCase()
    return COMMANDS.filter((c) => {
      if (c.label.toLowerCase().includes(q)) return true
      if (c.keywords?.some((k) => k.toLowerCase().includes(q))) return true
      return false
    })
  }, [query])

  // Reset selection quando filter muda
  useEffect(() => {
    setSelectedIdx(0)
  }, [query, open])

  const navigate = useCallback(
    (cmd: Command) => {
      router.push(cmd.href)
      setOpen(false)
      setQuery('')
    },
    [router],
  )

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(filtered.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      e.preventDefault()
      navigate(filtered[selectedIdx])
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ir pra... (digite pra buscar)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground md:inline-block">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado pra "{query}"
            </p>
          ) : (
            filtered.map((cmd, i) => {
              const Icon = cmd.icon
              const active = i === selectedIdx
              return (
                <button
                  key={cmd.href}
                  onClick={() => navigate(cmd)}
                  onMouseEnter={() => setSelectedIdx(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${
                    active ? 'bg-purple-500/10 text-white' : 'text-slate-300 hover:bg-slate-800/30'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{cmd.label}</span>
                  {active && (
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      ↵
                    </kbd>
                  )}
                </button>
              )
            })
          )}
        </div>

        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <kbd className="mr-1 rounded border border-border px-1 py-0.5">↑↓</kbd> navegar ·{' '}
          <kbd className="mx-1 rounded border border-border px-1 py-0.5">↵</kbd> abrir ·{' '}
          <kbd className="mx-1 rounded border border-border px-1 py-0.5">⌘K</kbd> fechar
        </div>
      </DialogContent>
    </Dialog>
  )
}
