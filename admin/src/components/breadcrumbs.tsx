'use client'

import React from 'react'
import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

/**
 * Breadcrumbs pra sub-páginas do admin.
 * Uso:
 *   <Breadcrumbs items={[{ label: 'Usuários', href: '/users' }, { label: 'João Silva' }]} />
 */
export function Breadcrumbs({
  items,
}: {
  items: Array<{ label: string; href?: string }>
}) {
  const router = useRouter()
  return (
    <nav className="mb-4 flex items-center gap-1 text-xs text-gray-400">
      <button onClick={() => router.push('/dashboard')} className="hover:text-white">
        Dashboard
      </button>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <ChevronRight className="h-3 w-3 text-gray-600" />
          {it.href ? (
            <button onClick={() => router.push(it.href!)} className="hover:text-white">
              {it.label}
            </button>
          ) : (
            <span className="text-gray-200">{it.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
