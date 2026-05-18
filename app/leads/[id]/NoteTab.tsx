'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type Props = {
  leadId: string
  initialNote: string | null
}

export function NoteTab({ leadId, initialNote }: Props) {
  const [note, setNote] = useState(initialNote ?? '')
  const [status, setStatus] = useState<SaveStatus>('idle')
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
      if (res.ok) {
        setStatus('saved')
        timerRef.current = setTimeout(() => setStatus('idle'), 2000)
      } else {
        setStatus('error')
        timerRef.current = setTimeout(() => setStatus('idle'), 3000)
      }
    } catch {
      setStatus('error')
      timerRef.current = setTimeout(() => setStatus('idle'), 3000)
    }
  }, [leadId, note])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Note</span>
        {status === 'saved' && (
          <span className="text-xs text-green-600 animate-in fade-in">Salvato ✓</span>
        )}
        {status === 'error' && (
          <span className="text-xs text-destructive">Errore</span>
        )}
      </div>
      <Textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        onBlur={handleBlur}
        rows={12}
        placeholder="Scrivi note sul lead..."
        className="resize-none"
      />
    </div>
  )
}
