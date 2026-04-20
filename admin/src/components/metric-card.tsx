import React from 'react'
import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  change?: number
  changeLabel?: string
  subtitle?: string
  className?: string
  iconClassName?: string
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  change,
  changeLabel,
  subtitle,
  className,
  iconClassName,
}: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-white">
              {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
            </p>
            {change !== undefined && (
              <p
                className={cn(
                  'text-xs font-medium',
                  isPositive ? 'text-green-400' : 'text-red-400'
                )}
              >
                {isPositive ? '+' : ''}
                {change}% {changeLabel || 'vs mês anterior'}
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600/20',
              iconClassName
            )}
          >
            <Icon className="h-6 w-6 text-indigo-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
