'use client'
import Link from 'next/link'
import { Target, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SnoozeMenu } from './SnoozeMenu'
import type { FeedItem } from '@/lib/tasks'

type Props = {
  item: FeedItem
  today: string
  onDone: (item: FeedItem) => void
  onSnooze: (item: FeedItem, days: number) => void
  onDelete: (item: FeedItem) => void
}

/** "scaduto 2g" / "oggi" / "gio 30 lug" */
function formatDate(date: string | null, today: string): string {
  if (!date) return 'senza data'
  if (date === today) return 'oggi'
  if (date < today) {
    const diff = Math.round((new Date(today).getTime() - new Date(date).getTime()) / 86400000)
    return `scaduto ${diff}g`
  }
  return new Date(date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function TaskRow({ item, today, onDone, onSnooze, onDelete }: Props) {
  const overdue = item.date !== null && item.date < today

  return (
    <div className="group flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/50">
      <input
        type="checkbox"
        checked={false}
        onChange={() => onDone(item)}
        aria-label={`Completa: ${item.titolo}`}
        className="h-4 w-4 shrink-0 cursor-pointer rounded border-input"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm">{item.titolo}</span>
          {item.closingSoon && (
            <span className="flex shrink-0 items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
              <Target className="h-3 w-3" />
              {item.valore ? `€${item.valore.toLocaleString('it-IT')}` : 'in chiusura'}
            </span>
          )}
        </div>
        {item.leadId && item.kind === 'task' && item.leadLabel && (
          <Link href={`/leads/${item.leadId}`} className="text-xs text-muted-foreground hover:text-primary">
            {item.leadLabel}
          </Link>
        )}
        {item.kind === 'dormiente' && (
          <span className="text-xs text-muted-foreground">
            {item.maiContattato
              ? `mai contattato · in attesa da ${item.giorniSilenzio}g`
              : `${item.giorniSilenzio}g di silenzio`}
          </span>
        )}
      </div>

      <span className={cn('shrink-0 text-xs', overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>
        {formatDate(item.date, today)}
      </span>

      <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        <SnoozeMenu onSnooze={days => onSnooze(item, days)} />
      </div>

      {item.taskId && (
        <button
          type="button"
          onClick={() => onDelete(item)}
          aria-label={`Elimina: ${item.titolo}`}
          className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
