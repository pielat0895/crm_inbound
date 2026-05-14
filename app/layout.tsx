import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { NavWrapper } from '@/components/ui/NavWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = { title: 'CRM Inbound' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={inter.className}>
        <NavWrapper>{children}</NavWrapper>
      </body>
    </html>
  )
}
