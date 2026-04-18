'use client'

import { useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Tag,
  Users,
  Award,
  FileText,
  Bell,
  Settings,
  LogOut,
  TrendingUp,
  ChevronDown,
  Map,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, getInitials } from '@/lib/utils'
import { LoadingPage } from '@/components/loading-spinner'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Ofertas', href: '/offers', icon: Tag },
  { label: 'Usuários', href: '/users', icon: Users },
  { label: 'Programas', href: '/programs', icon: Award },
  { label: 'Tabela de Resgate', href: '/award-charts', icon: Map },
  { label: 'Artigos', href: '/articles', icon: FileText },
  { label: 'Notificações', href: '/notifications', icon: Bell },
  { label: 'Configurações', href: '/settings', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <LoadingPage />
      </div>
    )
  }

  if (!session) return null

  const userName = session.user?.name || 'Admin'
  const userEmail = session.user?.email || ''

  return (
    <div className="flex h-screen bg-[#0B1120] overflow-hidden">
      {/* Sidebar */}
      <aside className="flex h-full w-60 flex-col border-r border-[#1E293B] bg-[#0B1120]">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-[#1E293B]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Milhas Extras</p>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User section at bottom */}
        <div className="border-t border-[#1E293B] p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={session.user?.image || ''} />
                  <AvatarFallback className="text-xs">{getInitials(userName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-medium text-white truncate">{userName}</p>
                  <p className="text-xs text-gray-400 truncate">{userEmail}</p>
                </div>
                <ChevronDown className="h-3 w-3 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-400 focus:text-red-300 cursor-pointer"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top header */}
        <header className="flex h-16 items-center justify-between border-b border-[#1E293B] bg-[#0B1120] px-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-gray-400">API Online</span>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.user?.image || ''} />
              <AvatarFallback className="text-xs">{getInitials(userName)}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
