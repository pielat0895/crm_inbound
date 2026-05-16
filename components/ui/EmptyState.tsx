import { type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; href: string }
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-base mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      {action && (
        <Link href={action.href} className={cn(buttonVariants({ size: 'sm' }), 'mt-4')}>
          {action.label}
        </Link>
      )}
    </div>
  )
}
