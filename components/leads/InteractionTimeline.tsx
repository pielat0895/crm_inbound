'use client'
import { useState } from 'react'
import type { Interaction } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

const TIPO_COLORS: Record<string, string> = {
  nota: 'bg-gray-100 text-gray-700',
  email: 'bg-blue-100 text-blue-700',
  chiamata: 'bg-green-100 text-green-700',
  meeting: 'bg-purple-100 text-purple-700',
}

type Props = {
  leadId: string
  interactions: Interaction[]
}

export function InteractionTimeline({ leadId, interactions }: Props) {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Storico interazioni</h2>
        <Button size="sm" variant="outline" onClick={() => setOpen(o => !o)}>
          <Plus className="h-4 w-4 mr-1" /> Aggiungi
        </Button>
      </div>

      {open && (
        <div className="rounded-md border p-4 space-y-3">
          <Select value={tipo} onValueChange={v => setTipo(v as Interaction['tipo'])}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nota">Nota</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="chiamata">Chiamata</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Contenuto..."
            value={contenuto}
            onChange={e => setContenuto(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={loading}>
              {loading ? 'Salvataggio...' : 'Salva'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Annulla</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {interactions.length === 0 && (
          <p className="text-sm text-muted-foreground">Nessuna interazione ancora.</p>
        )}
        {interactions.map(int => (
          <div key={int.id} className="flex gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_COLORS[int.tipo] ?? ''}`}>
                {int.tipo}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">
                {new Date(int.created_at).toLocaleString('it-IT')}
              </p>
              <p className="text-sm whitespace-pre-wrap">{int.contenuto}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
