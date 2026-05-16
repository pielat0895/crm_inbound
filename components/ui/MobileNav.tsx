'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Kanban, Users, Settings, Zap, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/leads', label: 'Lead', icon: Users },
  { href: '/settings', label: 'Impostazioni', icon: Settings },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm tracking-tight">CRM Inbound</span>
        </div>
        <button onClick={() => setOpen(true)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <>
          <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)} />
          <div className="lg:hidden fixed top-0 left-0 h-full w-64 z-50 bg-background border-r flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-5 border-b">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                  <Zap className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-semibold text-sm tracking-tight">CRM Inbound</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 px-3 py-4 space-y-0.5">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    pathname.startsWith(href)
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
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
          </div>
        </>
      )}
    </>
  )
}
