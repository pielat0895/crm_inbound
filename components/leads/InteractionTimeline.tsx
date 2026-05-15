'use client'
import { useState } from 'react'
import type { Interaction } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

const TIPO_COLORS: Record<string, string> = {
  nota: 'bg-gray-100 text-gray-700',
  email: 'bg-blue-100 text-blue-700',
  chiamata: 'bg-green-100 text-green-700',
  meeting: 'bg-purple-100 text-purple-700',
  ai_analisi: 'bg-amber-100 text-amber-700',
}

const TIPO_LABELS: Record<string, string> = {
  nota: 'Nota',
  email: 'Email',
  chiamata: 'Chiamata',
  meeting: 'Meeting',
  ai_analisi: '🤖 Analisi AI',
}

function AiAnalisiContent({ contenuto }: { contenuto: string }) {
  const [expanded, setExpanded] = useState(false)

  const sections = contenuto.split(/\n(?=\d️⃣)/).map(s => s.trim()).filter(Boolean)

  return (
    <div className="space-y-1">
      <div className={`space-y-3 overflow-hidden transition-all ${expanded ? '' : 'max-h-24'}`}>
        {sections.map((section, i) => {
          const lines = section.split('\n')
          const title = lines[0]
          const body = lines.slice(1).join('\n').trim()
          return (
            <div key={i}>
              <p className="text-xs font-semibold text-amber-800 mb-1">{title}</p>
              {body.split('\n').map((line, j) => {
                const isBullet = line.trim().startsWith('•')
                if (isBullet) {
                  const [label, ...rest] = line.replace('•', '').trim().split(':')
                  const value = rest.join(':').trim()
                  return (
                    <p key={j} className="text-xs text-muted-foreground pl-2">
                      {value ? <><span className="font-medium text-foreground">{label}:</span> {value}</> : label}
                    </p>
                  )
                }
                return <p key={j} className="text-xs text-foreground">{line}</p>
              })}
            </div>
          )
        })}
      </div>
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 mt-1"
      >
        {expanded ? <><ChevronUp className="h-3 w-3" /> Comprimi</> : <><ChevronDown className="h-3 w-3" /> Espandi analisi</>}
      </button>
    </div>
  )
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
          <div key={int.id} className={`rounded-lg border p-3 ${int.tipo === 'ai_analisi' ? 'border-amber-200 bg-amber-50/50' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COLORS[int.tipo] ?? 'bg-gray-100 text-gray-700'}`}>
                {TIPO_LABELS[int.tipo] ?? int.tipo}
              </span>
              <p className="text-xs text-muted-foreground">
                {new Date(int.created_at).toLocaleString('it-IT')}
              </p>
            </div>
            {int.tipo === 'ai_analisi'
              ? <AiAnalisiContent contenuto={int.contenuto} />
              : <p className="text-sm whitespace-pre-wrap">{int.contenuto}</p>
            }
          </div>
        ))}
      </div>
    </div>
  )
}
