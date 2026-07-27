'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TASK_PRIORITIES } from '@/types'
import type { TaskPriority } from '@/types'

type Props = {
  owners: string[]
  onCreated: () => void
  /** Precompila il dialog (usato da "crea task da nota"). */
  initial?: { titolo?: string; leadId?: string }
}

export function NewTaskDialog({ owners, onCreated, initial }: Props) {
  const [open, setOpen] = useState(false)
  const [titolo, setTitolo] = useState(initial?.titolo ?? '')
  const [note, setNote] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priorita, setPriorita] = useState<TaskPriority>('media')
  const [owner, setOwner] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titolo.trim()) {
      toast.error('Il titolo è obbligatorio')
      return
    }
    setSaving(true)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titolo: titolo.trim(),
        note: note.trim() || null,
        due_date: dueDate || null,
        priorita,
        owner: owner || null,
        lead_id: initial?.leadId ?? null,
      }),
    })
    setSaving(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Errore nella creazione')
      return
    }

    toast.success('Task creato')
    setTitolo('')
    setNote('')
    setDueDate('')
    setPriorita('media')
    setOpen(false)
    onCreated()
  }

  return (
    <>
      <Button size="sm" className="h-7 text-xs" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Nuovo task
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo task</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="task-titolo">Titolo</Label>
              <Input id="task-titolo" value={titolo} onChange={e => setTitolo(e.target.value)} autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="task-due">Scadenza</Label>
                <Input id="task-due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="task-priorita">Priorità</Label>
                <select
                  id="task-priorita"
                  value={priorita}
                  onChange={e => setPriorita(e.target.value as TaskPriority)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="task-owner">Owner</Label>
              <select
                id="task-owner"
                value={owner}
                onChange={e => setOwner(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">—</option>
                {owners.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="task-note">Note</Label>
              <Textarea id="task-note" rows={3} value={note} onChange={e => setNote(e.target.value)} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvataggio…' : 'Crea task'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
