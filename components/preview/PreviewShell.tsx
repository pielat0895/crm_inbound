'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Brygada_1918, Open_Sans } from 'next/font/google'
import {
  PLUM, ORANGE, GRAY_100, GRAY_BORDER, GRAY_500, WHITE,
  HEADING_FONT,
} from '@/components/dashboard-preview/tokens'
import { SearchModalPreview } from './SearchModalPreview'

// Font caricati SOLO per le rotte preview: nessuna modifica ad app/layout.tsx,
// così il resto del CRM resta su Inter come oggi.
const heading = Brygada_1918({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-heading' })
const body = Open_Sans({ subsets: ['latin'], weight: ['300', '400', '600', '700', '800'], variable: '--font-body' })

const NAV_ITEMS = [
  { href: '/tasks-preview', label: 'Da fare' },
  { href: '/dashboard-preview', label: 'Dashboard' },
  { href: '/pipeline-preview', label: 'Pipeline' },
  { href: '/leads-preview', label: 'Lead' },
  { href: '/settings-preview', label: 'Impostazioni' },
]

export type HeaderStat = { value: string; label: string; color?: string }

type Props = {
  children: React.ReactNode
  pageLabel: string
  titleAccent: string
  titleRest: string
  sub?: string
  headerStats?: HeaderStat[]
  /** "9 lead attivi · 4 follow-up scaduti" — calcolato dalla pagina con dati reali. */
  footerNote?: string
}

// Il file sorgente del logo è un lockup molto largo e basso (~21:1): a piena
// altezza ci sta solo nel pannello ampio del login. Nelle zone compatte
// (sidebar/header/drawer mobile) usiamo un marchio testuale, come fa già
// components/ui/Nav.tsx in produzione.
function BrandMark({ fontSize }: { fontSize: number }) {
  return (
    <span style={{ fontFamily: HEADING_FONT, fontWeight: 700, fontSize, color: WHITE, letterSpacing: '.02em' }}>
      Urbistat
    </span>
  )
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex flex-col">
      {NAV_ITEMS.map(item => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            style={{
              textAlign: 'left',
              border: 'none',
              cursor: 'pointer',
              padding: '12px 22px',
              background: active ? ORANGE : 'transparent',
              color: active ? WHITE : 'rgba(255,255,255,.66)',
              font: `${active ? 700 : 600} 12px/1 'Open Sans'`,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              display: 'block',
            }}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

export function PreviewShell({ children, pageLabel, titleAccent, titleRest, sub, headerStats, footerNote }: Props) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className={`${heading.variable} ${body.variable}`} style={{ fontFamily: 'var(--font-body)', background: GRAY_100, color: PLUM, minHeight: '100vh' }}>
      {/* Sidebar desktop */}
      <nav
        className="hidden lg:flex"
        style={{
          position: 'fixed', left: 0, top: 0, height: '100%', width: 216,
          background: PLUM, flexDirection: 'column', zIndex: 30,
        }}
      >
        <div style={{ padding: '26px 22px 18px' }}>
          <BrandMark fontSize={20} />
        </div>
        <div style={{ padding: '0 22px 20px' }}>
          <p style={{ margin: 0, font: "700 11px/1.3 'Open Sans'", letterSpacing: '.14em', color: ORANGE }}>
            CRM INBOUND
          </p>
        </div>
        <div style={{ margin: '0 22px 22px' }}>
          <SearchModalPreview />
        </div>
        <NavLinks pathname={pathname} />
        <div style={{ marginTop: 'auto', padding: 22 }}>
          <div style={{ height: 1, background: 'rgba(255,255,255,.18)', marginBottom: 14 }} />
          <p style={{ margin: 0, font: "400 11px/1.6 'Open Sans'", color: 'rgba(255,255,255,.5)' }}>
            {footerNote ?? 'CRM Inbound'}
          </p>
        </div>
      </nav>

      {/* Header mobile */}
      <header
        className="flex lg:hidden"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
          alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', background: PLUM,
        }}
      >
        <BrandMark fontSize={16} />
        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            border: '1px solid rgba(255,255,255,.3)', background: 'transparent', color: WHITE,
            font: "700 10px/1 'Open Sans'", letterSpacing: '.12em', padding: '8px 10px', cursor: 'pointer',
          }}
        >
          MENU
        </button>
      </header>

      {drawerOpen && (
        <div className="lg:hidden">
          <div
            onClick={() => setDrawerOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(55,46,53,.55)', zIndex: 45 }}
          />
          <div style={{ position: 'fixed', top: 0, left: 0, height: '100%', width: 264, zIndex: 50, background: PLUM, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px' }}>
              <BrandMark fontSize={17} />
              <button
                onClick={() => setDrawerOpen(false)}
                style={{ border: 'none', background: 'transparent', color: WHITE, font: "600 16px/1 'Open Sans'", cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            <div style={{ marginTop: 10 }}>
              <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Contenuto */}
      <div className="lg:ml-[216px] pt-[58px] lg:pt-0" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <header
          style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap',
            padding: '32px 40px 24px', background: WHITE, borderBottom: `1px solid ${GRAY_BORDER}`,
          }}
        >
          <div style={{ flex: '1 1 380px', minWidth: 0 }}>
            <p style={{ margin: '0 0 10px', font: "700 11px/1 'Open Sans'", letterSpacing: '.14em', color: ORANGE }}>
              {pageLabel}
            </p>
            <h1 style={{ margin: 0, fontFamily: HEADING_FONT, fontWeight: 700, fontSize: 38, lineHeight: 1.1, textTransform: 'uppercase' }}>
              <span style={{ color: ORANGE }}>{titleAccent}</span>{titleAccent && titleRest ? ' ' : ''}{titleRest}
            </h1>
            {sub && (
              <p style={{ margin: '10px 0 0', font: "400 13px/1.5 'Open Sans'", color: GRAY_500 }}>{sub}</p>
            )}
          </div>
          {headerStats && headerStats.length > 0 && (
            <div style={{ flex: 'none', display: 'flex', alignItems: 'stretch', borderLeft: `1px solid ${GRAY_BORDER}`, maxWidth: '100%', overflowX: 'auto' }}>
              {headerStats.map(k => (
                <div key={k.label} style={{ flex: 'none', padding: '0 24px', borderRight: `1px solid ${GRAY_BORDER}` }}>
                  <p style={{ margin: 0, font: "700 32px/1.2 'Open Sans'", color: k.color ?? PLUM }}>{k.value}</p>
                  <p style={{ margin: '6px 0 0', font: "600 10px/1.3 'Open Sans'", letterSpacing: '.1em', color: GRAY_500 }}>{k.label}</p>
                </div>
              ))}
            </div>
          )}
        </header>

        <main style={{ flex: 1, padding: '30px 40px 44px', minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
