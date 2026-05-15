'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Kanban, Users, Settings, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SearchModal } from './SearchModal'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/leads', label: 'Lead', icon: Users },
  { href: '/settings', label: 'Impostazioni', icon: Settings },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <nav className="fixed left-0 top-0 h-full w-56 border-r bg-background flex flex-col">
      <div className="flex items-center gap-2 px-5 py-5 border-b">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm tracking-tight">CRM Inbound</span>
      </div>

      <div className="px-3 py-3 border-b">
        <SearchModal />
      </div>

      <div className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </div>

      <div className="px-5 py-4 border-t">
        <p className="text-xs text-muted-foreground">Urbistat · CRM v1</p>
      </div>
    </nav>
  )
}
