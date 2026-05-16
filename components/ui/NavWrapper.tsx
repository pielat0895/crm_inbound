'use client'
import { usePathname } from 'next/navigation'
import { Nav } from './Nav'
import { MobileNav } from './MobileNav'
import { Toaster } from '@/components/ui/sonner'

export function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
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
