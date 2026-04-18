'use client'

import React from 'react'
import { useSession, signOut } from 'next-auth/react'
import { LogOut, Shield, TrendingUp, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'

interface ThresholdRowProps {
  label: string
  condition: string
  colorClass: string
}

function ThresholdRow({ label, condition, colorClass }: ThresholdRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${colorClass}`}
        >
          {label}
        </span>
      </div>
      <span className="text-gray-300 text-sm">{condition}</span>
    </div>
  )
}

export default function SettingsPage() {
  const { data: session } = useSession()

  const userName = session?.user?.name ?? 'Administrador'
  const userEmail = session?.user?.email ?? '—'
  const userImage = session?.user?.image ?? ''

  return (
    <div className="space-y-6 bg-[#0B1120] max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-gray-400 text-sm mt-1">
          Configurações gerais do painel administrativo Milhas Extras.
        </p>
      </div>

      {/* Admin info card */}
      <Card className="bg-[#141C2F] border-[#1E293B]">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-indigo-400" />
            Informações do Administrador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={userImage} />
              <AvatarFallback className="text-base bg-indigo-600/30 text-indigo-300">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-semibold text-lg">{userName}</p>
              <p className="text-gray-400 text-sm">{userEmail}</p>
              <Badge
                variant="outline"
                className="mt-1.5 border-indigo-500/30 text-indigo-400 bg-indigo-500/10 text-xs"
              >
                Administrador
              </Badge>
            </div>
          </div>

          <Separator className="bg-gray-700 mb-4" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Função</span>
              <span className="text-white">Admin</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status</span>
              <span className="flex items-center gap-1.5 text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                Ativo
              </span>
            </div>
          </div>

          <Separator className="bg-gray-700 my-4" />

          <Button
            variant="destructive"
            className="gap-2 w-full sm:w-auto"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </Button>
        </CardContent>
      </Card>

      {/* CPM Classification thresholds */}
      <Card className="bg-[#141C2F] border-[#1E293B]">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-400" />
            Limites de Classificação CPM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 mb-4 rounded-md bg-indigo-600/10 border border-indigo-500/20 px-3 py-2">
            <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-indigo-300 text-xs leading-relaxed">
              Estes limites são utilizados automaticamente pelo sistema para classificar as
              ofertas de acordo com o CPM informado. A classificação pode ser ajustada
              manualmente no formulário de cada oferta.
            </p>
          </div>

          <div className="divide-y divide-gray-700">
            <ThresholdRow
              label="Imperdível"
              condition="CPM menor que R$ 20,00"
              colorClass="bg-green-500/20 text-green-400 border-green-500/30"
            />
            <ThresholdRow
              label="Boa"
              condition="CPM entre R$ 20,00 e R$ 30,00"
              colorClass="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
            />
            <ThresholdRow
              label="Normal"
              condition="CPM maior que R$ 30,00"
              colorClass="bg-red-500/20 text-red-400 border-red-500/30"
            />
          </div>
        </CardContent>
      </Card>

      {/* API info */}
      <Card className="bg-[#141C2F] border-[#1E293B]">
        <CardHeader>
          <CardTitle className="text-white text-base">Configurações de API</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">URL Base da API</span>
              <code className="text-indigo-300 bg-gray-700 px-2 py-0.5 rounded text-xs">
                {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Versão</span>
              <span className="text-white">v1</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Status da conexão</span>
              <span className="flex items-center gap-1.5 text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                Online
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
