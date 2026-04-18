import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600',
        secondary: 'border-transparent bg-gray-700 text-gray-200 hover:bg-gray-600',
        destructive: 'border-transparent bg-red-600 text-white hover:bg-red-700',
        outline: 'text-gray-200 border-gray-600',
        success: 'border-transparent bg-green-700 text-green-100',
        warning: 'border-transparent bg-yellow-700 text-yellow-100',
        danger: 'border-transparent bg-red-700 text-red-100',
        blue: 'border-transparent bg-blue-700 text-blue-100',
        purple: 'border-transparent bg-purple-700 text-purple-100',
        gray: 'border-transparent bg-gray-700 text-gray-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
