'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { PLUM, ORANGE, GRAY_BORDER, GRAY_500 } from '@/components/dashboard-preview/tokens'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type Props = {
  leadId: string
  initialNote: string | null
}

export function NoteTabPreview({ leadId, initialNote }: Props) {
  const [note, setNote] = useState(initialNote ?? '')
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [creating, setCreating] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const handleBlur = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setStatus('saving')
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      setStatus(res.ok ? 'saved' : 'error')
    } catch {
      setStatus('error')
    } finally {
      timerRef.current = setTimeout(() => setStatus('idle'), 2000)
    }
  }, [leadId, note])

  const handleCreateTask = useCallback(async () => {
    const firstLine = note.split('\n').map(l => l.trim()).find(Boolean)
    if (!firstLine) {
      toast.error('Scrivi una nota prima di creare il task')
      return
    }
    setCreating(true)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titolo: firstLine.slice(0, 120), note, lead_id: leadId, priorita: 'media' }),
    })
    setCreating(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Errore nella creazione del task')
      return
    }
    toast.success('Task creato · lo trovi in "Da fare"')
  }, [leadId, note])

  return (
    <div style={{ background: '#fff', border: `1px solid ${GRAY_BORDER}`, borderTop: 'none', padding: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ margin: 0, font: "600 10px/1 'Open Sans'", letterSpacing: '.12em', color: GRAY_500 }}>
          NOTE — SALVATE AUTOMATICAMENTE
          {status === 'saved' && <span style={{ color: '#2f9e6a', marginLeft: 8 }}>SALVATO ✓</span>}
          {status === 'error' && <span style={{ color: ORANGE, marginLeft: 8 }}>ERRORE</span>}
        </p>
        <button
          onClick={handleCreateTask}
          disabled={creating}
          style={{ height: 30, padding: '0 12px', border: `1px solid ${PLUM}`, background: '#fff', font: "600 10px/1 'Open Sans'", letterSpacing: '.1em', cursor: creating ? 'default' : 'pointer' }}
        >
          CREA TASK DA QUESTA NOTA
        </button>
      </div>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        onBlur={handleBlur}
        rows={14}
        placeholder="Scrivi note sul lead..."
        style={{ width: '100%', border: `1px solid ${GRAY_BORDER}`, background: '#fff', padding: 14, font: "400 13px/1.7 'Open Sans'", resize: 'none', boxSizing: 'border-box' }}
      />
    </div>
  )
}
