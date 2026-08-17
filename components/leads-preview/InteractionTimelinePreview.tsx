'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Interaction } from '@/types'
import { PLUM, ORANGE, TEAL, SKY, BLUE, GRAY_500, GRAY_BORDER } from '@/components/dashboard-preview/tokens'

const TIPO_RULE: Record<string, string> = {
  nota: GRAY_500,
  email: BLUE,
  chiamata: SKY,
  meeting: TEAL,
  ai_analisi: ORANGE,
}

const TIPO_LABELS: Record<string, string> = {
  nota: 'NOTA',
  email: 'EMAIL',
  chiamata: 'CHIAMATA',
  meeting: 'MEETING',
  ai_analisi: 'ANALISI AI',
}

type Props = {
  leadId: string
  interactions: Interaction[]
}

export function InteractionTimelinePreview({ leadId, interactions }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState<Interaction['tipo']>('nota')
  const [contenuto, setContenuto] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAdd() {
    if (!contenuto.trim()) return
    setLoading(true)
    await fetch(`/api/leads/${leadId}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, contenuto }),
    })
    setContenuto('')
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <p style={{ margin: 0, font: "700 11px/1 'Open Sans'", letterSpacing: '.12em' }}>STORICO INTERAZIONI</p>
        <button
          onClick={() => setOpen(o => !o)}
          style={{ height: 28, padding: '0 12px', border: `1px solid ${PLUM}`, background: '#fff', font: "600 10px/1 'Open Sans'", letterSpacing: '.1em', cursor: 'pointer' }}
        >
          AGGIUNGI
        </button>
      </div>

      {open && (
        <div style={{ background: '#fff', padding: 14, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <select
            value={tipo}
            onChange={e => setTipo(e.target.value as Interaction['tipo'])}
            style={{ height: 32, border: `1px solid ${GRAY_BORDER}`, background: '#fff', padding: '0 8px', font: "400 12px/1 'Open Sans'" }}
          >
            <option value="nota">Nota</option>
            <option value="email">Email</option>
            <option value="chiamata">Chiamata</option>
            <option value="meeting">Meeting</option>
          </select>
          <textarea
            placeholder="Contenuto..."
            value={contenuto}
            onChange={e => setContenuto(e.target.value)}
            rows={3}
            style={{ border: `1px solid ${GRAY_BORDER}`, padding: 8, font: "400 12px/1.5 'Open Sans'", resize: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleAdd}
              disabled={loading}
              style={{ height: 30, padding: '0 14px', border: 'none', background: ORANGE, color: '#fff', font: "700 10px/1 'Open Sans'", letterSpacing: '.1em', cursor: loading ? 'default' : 'pointer' }}
            >
              {loading ? 'SALVATAGGIO…' : 'SALVA'}
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{ height: 30, padding: '0 14px', border: 'none', background: 'transparent', font: "600 10px/1 'Open Sans'", color: GRAY_500, cursor: 'pointer' }}
            >
              ANNULLA
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {interactions.length === 0 && (
          <p style={{ margin: 0, font: "400 12px/1.4 'Open Sans'", color: GRAY_500 }}>Nessuna interazione ancora.</p>
        )}
        {interactions.map(int => {
          const rule = TIPO_RULE[int.tipo] ?? GRAY_500
          return (
            <div key={int.id} style={{ background: '#fff', padding: '14px 16px', borderLeft: `3px solid ${rule}` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                <span style={{ font: "700 9px/1.3 'Open Sans'", letterSpacing: '.1em', color: rule }}>
                  {TIPO_LABELS[int.tipo] ?? int.tipo.toUpperCase()}
                </span>
                <span style={{ font: "400 11px/1.3 'Open Sans'", color: GRAY_500 }}>
                  {new Date(int.created_at).toLocaleString('it-IT')}
                </span>
              </div>
              <p style={{ margin: 0, font: "400 12px/1.6 'Open Sans'", whiteSpace: 'pre-wrap' }}>{int.contenuto}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
