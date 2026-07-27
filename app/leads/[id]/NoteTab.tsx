'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ListPlus } from 'lucide-react'
import { toast } from 'sonner'

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

  const [creating, setCreating] = useState(false)

  const handleCreateTask = useCallback(async () => {
    // Il titolo è la prima riga non vuota della nota, tagliata a 120 caratteri.
    const firstLine = note.split('\n').map(l => l.trim()).find(Boolean)
    if (!firstLine) {
      toast.error('Scrivi una nota prima di creare il task')
      return
    }
    setCreating(true)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titolo: firstLine.slice(0, 120),
        note,
        lead_id: leadId,
        priorita: 'media',
      }),
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Note</span>
        <div className="flex items-center gap-3">
          {status === 'saved' && (
            <span className="text-xs text-green-600 animate-in fade-in">Salvato ✓</span>
          )}
          {status === 'error' && (
            <span className="text-xs text-destructive">Errore</span>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={handleCreateTask}
            disabled={creating}
          >
            <ListPlus className="mr-1 h-3.5 w-3.5" />
            Crea task da questa nota
          </Button>
        </div>
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
