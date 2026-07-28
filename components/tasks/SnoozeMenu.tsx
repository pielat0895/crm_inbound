'use client'
import { Clock } from 'lucide-react'

const OPTIONS = [
  { label: 'Domani', days: 1 },
  { label: 'Fra 3 giorni', days: 3 },
  { label: 'Fra una settimana', days: 7 },
]

export function SnoozeMenu({ onSnooze }: { onSnooze: (days: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
      {OPTIONS.map(o => (
        <button
          key={o.days}
          type="button"
          onClick={() => onSnooze(o.days)}
          className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={`Rimanda: ${o.label}`}
        >
          +{o.days}g
        </button>
      ))}
    </div>
  )
}
