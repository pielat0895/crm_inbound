'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import Link from 'next/link'
import type { LeadWithComputed } from '@/types'
import { ORIGINE_OPTIONS, STATO_APPUNTAMENTO_OPTIONS } from '@/types'
import { PLUM, ORANGE, GRAY_150, GRAY_BORDER } from '@/components/dashboard-preview/tokens'

type Props = {
  stages: string[]
  owners: string[]
  leads: LeadWithComputed[]
  countDaSistemare: number
}

const selectStyle: React.CSSProperties = {
  height: 34, border: `1px solid ${GRAY_BORDER}`, background: '#fff', padding: '0 10px', font: "400 13px/1 'Open Sans'",
}
const buttonOutlineStyle: React.CSSProperties = {
  height: 34, padding: '0 14px', border: `1px solid ${PLUM}`, background: '#fff', font: "600 11px/1 'Open Sans'", letterSpacing: '.08em', cursor: 'pointer',
}

export function LeadFiltersPreview({ stages, owners, leads, countDaSistemare }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const q = params.get('q') ?? ''
  const stadio = params.get('stadio') ?? 'all'
  const origine = params.get('origine') ?? 'all'
  const statoAppuntamento = params.get('stato_appuntamento') ?? 'all'
  const scaduto = params.get('scaduto') === '1'
  const owner = params.get('owner') ?? 'all'

  const update = useCallback((updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString())
    next.delete('page')
    for (const [k, v] of Object.entries(updates)) {
      if (v && v !== 'all') next.set(k, v)
      else next.delete(k)
    }
    router.push(`${pathname}?${next.toString()}`)
  }, [params, pathname, router])

  function exportCSV() {
    const headers = ['Nome', 'Cognome', 'Azienda', 'Email', 'Tel', 'Origine', 'Stadio', 'Contattato', 'Valore', 'Data apertura', 'Data chiusura', 'Ultimo contatto']
    const lines = [
      headers.join(','),
      ...leads.map(l => [
        `"${l.nome ?? ''}"`, `"${l.cognome ?? ''}"`, `"${l.azienda ?? ''}"`, `"${l.email}"`, `"${l.tel ?? ''}"`,
        `"${l.origine ?? ''}"`, `"${l.stadio_pipeline}"`, l.contattato ? 'Sì' : 'No', l.valore ?? '',
        l.data_apertura ?? '', l.data_chiusura ?? '', l.data_ultimo_contatto ?? '',
      ].join(',')),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'leads.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <input
        placeholder="Cerca nome, azienda, email"
        defaultValue={q}
        onChange={e => update({ q: e.target.value || null })}
        style={{ width: 280, height: 34, border: `1px solid ${GRAY_BORDER}`, background: '#fff', padding: '0 12px', font: "400 13px/1 'Open Sans'" }}
      />
      <select value={stadio} onChange={e => update({ stadio: e.target.value })} style={selectStyle}>
        <option value="all">Tutti gli stadi</option>
        {stages.map(s => <option key={s} value={s}>{s}</option>)}
        <option value="Da sistemare">Da sistemare</option>
      </select>
      <select value={owner} onChange={e => update({ owner: e.target.value })} style={selectStyle}>
        <option value="all">Tutti gli owner</option>
        {owners.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <select value={origine} onChange={e => update({ origine: e.target.value })} style={selectStyle}>
        <option value="all">Tutte le origini</option>
        {ORIGINE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <select value={statoAppuntamento} onChange={e => update({ stato_appuntamento: e.target.value })} style={selectStyle}>
        <option value="all">Tutti gli appuntamenti</option>
        {STATO_APPUNTAMENTO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <button
        onClick={() => update({ scaduto: scaduto ? null : '1' })}
        style={{ ...buttonOutlineStyle, background: scaduto ? PLUM : '#fff', color: scaduto ? '#fff' : PLUM }}
      >
        FOLLOW-UP SCADUTO
      </button>
      {countDaSistemare > 0 && (
        <Link
          href="/leads/da-sistemare"
          style={{
            height: 34, padding: '0 14px', border: 'none', background: GRAY_150, color: PLUM,
            font: "700 11px/1 'Open Sans'", letterSpacing: '.08em', textDecoration: 'none', whiteSpace: 'nowrap',
            display: 'inline-flex', alignItems: 'center',
          }}
        >
          {countDaSistemare} DA SISTEMARE
        </Link>
      )}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <button onClick={exportCSV} style={buttonOutlineStyle}>ESPORTA CSV</button>
        <button
          onClick={() => router.push('/leads/new')}
          style={{ height: 34, padding: '0 16px', border: 'none', background: ORANGE, color: '#fff', font: "700 11px/1 'Open Sans'", letterSpacing: '.12em', cursor: 'pointer' }}
        >
          NUOVO LEAD
        </button>
      </div>
    </div>
  )
}
