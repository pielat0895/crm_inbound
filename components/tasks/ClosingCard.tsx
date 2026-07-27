'use client'
import Link from 'next/link'
import type { ClosingItem } from '@/lib/tasks'

export function ClosingCard({ item }: { item: ClosingItem }) {
  return (
    <Link
      href={`/leads/${item.leadId}`}
      className="block rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <p className="truncate text-sm font-medium">{item.leadLabel}</p>
      <p className="mt-1 text-sm text-primary">
        {item.valore ? `€${item.valore.toLocaleString('it-IT')}` : '—'}
        {item.stimato && <span className="ml-1 text-xs text-muted-foreground">stimato</span>}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {item.stadio}
        {item.dataPrevista
          ? ` · ${new Date(item.dataPrevista).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`
          : ` · ultimo contatto ${item.giorniUltimoContatto ?? '—'}g fa`}
      </p>
    </Link>
  )
}
