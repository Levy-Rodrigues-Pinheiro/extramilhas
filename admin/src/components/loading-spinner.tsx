import React from 'react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

export function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-indigo-600 border-t-transparent',
          sizeClasses[size]
        )}
        role="status"
        aria-label={label || 'Carregando...'}
      />
      {label && <p className="text-sm text-gray-400">{label}</p>}
    </div>
  )
}

export function LoadingPage() {
  return (
    <div className="flex h-64 items-center justify-center">
      <LoadingSpinner size="lg" label="Carregando..." />
    </div>
  )
}
