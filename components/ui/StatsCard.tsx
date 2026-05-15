import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  color?: 'blue' | 'green' | 'amber' | 'red'
}

const colorMap = {
  blue:  { bg: 'bg-blue-50',   icon: 'text-blue-600',   border: 'border-blue-100' },
  green: { bg: 'bg-green-50',  icon: 'text-green-600',  border: 'border-green-100' },
  amber: { bg: 'bg-amber-50',  icon: 'text-amber-600',  border: 'border-amber-100' },
  red:   { bg: 'bg-red-50',    icon: 'text-red-600',    border: 'border-red-100' },
}

export function StatsCard({ title, value, subtitle, icon: Icon, color }: Props) {
  const c = color ? colorMap[color] : null
  return (
    <div className={cn('rounded-xl border p-4 bg-card', c?.border)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {Icon && c && (
          <div className={cn('shrink-0 rounded-lg p-2', c.bg)}>
            <Icon className={cn('h-5 w-5', c.icon)} />
          </div>
        )}
      </div>
    </div>
  )
}
