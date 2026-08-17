'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brygada_1918, Open_Sans } from 'next/font/google'
import { PLUM, ORANGE, GRAY_BORDER, GRAY_500 } from '@/components/dashboard-preview/tokens'

const heading = Brygada_1918({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-heading' })
const body = Open_Sans({ subsets: ['latin'], weight: ['300', '400', '600', '700', '800'], variable: '--font-body' })

export default function LoginPreviewPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/tasks-preview')
    } else {
      const data = await res.json().catch(() => null)
      setError(res.status === 429 ? (data?.error ?? 'Troppi tentativi.') : 'Password errata')
      setLoading(false)
    }
  }

  return (
    <div className={`${heading.variable} ${body.variable}`} style={{ fontFamily: 'var(--font-body)', minHeight: '100vh', display: 'flex', flexWrap: 'wrap' }}>
      <div
        style={{
          flex: '1 1 420px', minHeight: 360, background: PLUM, position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 44,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/urbistat/diamond-cross-hero.png"
          alt=""
          style={{ position: 'absolute', right: -60, bottom: -60, width: 340, opacity: 0.32 }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/urbistat/urbistat-logo.png"
          alt="UrbiStat"
          style={{ height: 34, maxWidth: '100%', filter: 'invert(1) brightness(2) saturate(0)', position: 'relative' }}
        />
        <div style={{ position: 'relative' }}>
          <p style={{ margin: '0 0 12px', font: "700 11px/1 'Open Sans'", letterSpacing: '.14em', color: ORANGE }}>
            CRM INBOUND
          </p>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 40, lineHeight: 1.05, textTransform: 'uppercase', color: '#fff' }}>
            <span style={{ color: ORANGE }}>IL TUO</span><br />PORTAFOGLIO<br />LEAD
          </h1>
        </div>
      </div>

      <div style={{ flex: '1 1 380px', maxWidth: 460, background: '#fff', padding: 44, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={{ margin: '0 0 10px', font: "700 11px/1 'Open Sans'", letterSpacing: '.14em', color: ORANGE }}>ACCESSO</p>
        <h2 style={{ margin: '0 0 28px', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 26, lineHeight: 1.1, textTransform: 'uppercase' }}>
          ENTRA NEL CRM
        </h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="password" style={{ font: "600 10px/1 'Open Sans'", letterSpacing: '.12em', color: GRAY_500 }}>
            PASSWORD
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            style={{ display: 'block', width: '100%', marginTop: 8, height: 44, border: `1px solid ${GRAY_BORDER}`, background: '#fff', padding: '0 14px', font: "400 15px/1 'Open Sans'", boxSizing: 'border-box' }}
          />
          {error && (
            <p style={{ margin: '10px 0 0', font: "400 12px/1.4 'Open Sans'", color: '#c0392b' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: 20, width: '100%', height: 44, border: 'none', background: ORANGE, color: '#fff', font: "700 12px/1 'Open Sans'", letterSpacing: '.12em', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'ACCESSO...' : 'ENTRA'}
          </button>
        </form>
        <p style={{ margin: '22px 0 0', font: "400 12px/1.5 'Open Sans'", color: GRAY_500 }}>
          Accesso riservato. Le sessioni scadono dopo 30 giorni di inattività.
        </p>
      </div>
    </div>
  )
}
