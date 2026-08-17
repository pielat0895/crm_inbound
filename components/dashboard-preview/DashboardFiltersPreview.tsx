'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { PLUM, GRAY_BORDER, GRAY_500 } from './tokens'

const PRESETS = [
  { label: 'TUTTO', value: 'all' },
  { label: '30G', value: '30' },
  { label: '60G', value: '60' },
  { label: '90G', value: '90' },
  { label: '1 ANNO', value: '365' },
]

type Props = {
  owners: string[]
  stages: string[]
  origini: string[]
}

const selectStyle: React.CSSProperties = {
  height: 28, border: `1px solid ${GRAY_BORDER}`, background: '#fff', padding: '0 8px', font: "400 12px/1 'Open Sans'",
}

export function DashboardFiltersPreview({ owners, stages, origini }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const current = params.get('range') ?? '30'
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const owner = params.get('owner') ?? ''
  const stadio = params.get('stadio') ?? ''
  const origine = params.get('origine') ?? ''

  const update = useCallback((updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    router.push(`${pathname}?${next.toString()}`)
  }, [params, pathname, router])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: '#fff', border: `1px solid ${GRAY_BORDER}`, padding: '14px 18px' }}>
      <span style={{ font: "700 10px/1 'Open Sans'", letterSpacing: '.12em', color: GRAY_500 }}>PERIODO</span>
      {PRESETS.map(p => {
        const active = current === p.value && !from
        return (
          <button
            key={p.value}
            onClick={() => update({ range: p.value, from: null, to: null })}
            style={{
              height: 28, padding: '0 12px', border: `1px solid ${active ? PLUM : GRAY_BORDER}`,
              background: active ? PLUM : '#fff', color: active ? '#fff' : PLUM,
              font: "600 11px/1 'Open Sans'", letterSpacing: '.08em', cursor: 'pointer',
            }}
          >
            {p.label}
          </button>
        )
      })}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="date"
          value={from}
          onChange={e => update({ from: e.target.value, range: null })}
          style={{ height: 28, border: `1px solid ${GRAY_BORDER}`, padding: '0 8px', font: "400 12px/1 'Open Sans'" }}
        />
        <span style={{ color: GRAY_500 }}>→</span>
        <input
          type="date"
          value={to}
          onChange={e => update({ to: e.target.value, range: null })}
          style={{ height: 28, border: `1px solid ${GRAY_BORDER}`, padding: '0 8px', font: "400 12px/1 'Open Sans'" }}
        />
      </div>
      <span style={{ width: 1, height: 24, background: GRAY_BORDER, margin: '0 6px' }} />
      <select value={owner} onChange={e => update({ owner: e.target.value || null })} style={selectStyle}>
        <option value="">Tutti gli owner</option>
        {owners.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <select value={stadio} onChange={e => update({ stadio: e.target.value || null })} style={selectStyle}>
        <option value="">Tutti gli stadi</option>
        {stages.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select value={origine} onChange={e => update({ origine: e.target.value || null })} style={selectStyle}>
        <option value="">Tutte le origini</option>
        {origini.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
