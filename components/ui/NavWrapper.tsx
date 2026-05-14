'use client'
import { usePathname } from 'next/navigation'
import { Nav } from './Nav'

export function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showNav = pathname !== '/login'
  return (
    <div className="flex min-h-screen">
      {showNav && <Nav />}
      <main className={showNav ? 'ml-56 flex-1 p-6' : 'flex-1'}>{children}</main>
    </div>
  )
}
