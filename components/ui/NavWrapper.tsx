'use client'
import { usePathname } from 'next/navigation'
import { Nav } from './Nav'
import { MobileNav } from './MobileNav'
import { Toaster } from '@/components/ui/sonner'

// Rotte del redesign UrbiStat: hanno una propria shell (components/preview/PreviewShell)
// che sostituisce interamente Nav/MobileNav, così le due chrome non si sovrappongono.
const PREVIEW_PATH_PREFIXES = [
  '/login-preview', '/tasks-preview', '/dashboard-preview', '/pipeline-preview', '/leads-preview', '/settings-preview',
]

export function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (PREVIEW_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return <>{children}</>
  }
  const showNav = pathname !== '/login'
  return (
    <div className="flex min-h-screen">
      {showNav && <Nav />}
      {showNav && <MobileNav />}
      <main className={showNav ? 'lg:ml-56 flex-1 p-6 pt-16 lg:pt-6' : 'flex-1'}>{children}</main>
      <Toaster position="bottom-right" richColors />
    </div>
  )
}
