'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { OverdueBadge } from '@/components/ui/OverdueBadge'
import type { LeadWithComputed } from '@/types'
import { useRouter } from 'next/navigation'

const ORIGINE_COLORS: Record<string, string> = {
  'Info':                 'bg-blue-100 text-blue-700',
  'LeadChampion':         'bg-violet-100 text-violet-700',
  'Sito (Lead Champion)': 'bg-indigo-100 text-indigo-700',
  'Lead Generation':      'bg-cyan-100 text-cyan-700',
  'Landing Page':         'bg-sky-100 text-sky-700',
  'Support':              'bg-gray-100 text-gray-600',
  'Promo Real Estate':    'bg-orange-100 text-orange-700',
  'Clienti':              'bg-green-100 text-green-700',
  'Eventi':               'bg-pink-100 text-pink-700',
}

type Props = {
  lead: LeadWithComputed
  threshold: number
}

export function KanbanCard({ lead, threshold }: Props) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { lead },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const origineClass = lead.origine
    ? (ORIGINE_COLORS[lead.origine] ?? 'bg-muted text-muted-foreground')
    : ''

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => router.push(`/leads/${lead.id}`)}
      className="rounded-md border bg-card p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow space-y-1.5"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm leading-tight">
          {lead.nome} {lead.cognome}
        </p>
        <OverdueBadge giorni={lead.giorni_ultimo_contatto} threshold={threshold} />
      </div>
      {lead.azienda && (
        <p className="text-xs text-muted-foreground">{lead.azienda}</p>
      )}
      {lead.note && (
        <p className="text-xs text-muted-foreground italic line-clamp-2 border-l-2 border-primary/30 pl-2">
          {lead.note}
        </p>
      )}
      <div className="flex gap-1.5 flex-wrap items-center">
        {lead.origine && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${origineClass}`}>
            {lead.origine}
          </span>
        )}
        {lead.valore != null && (
          <span className="text-xs text-green-700 font-medium">
            €{lead.valore.toLocaleString('it-IT')}
          </span>
        )}
        {lead.giorni_aperto !== null && (
          <span className="text-xs text-muted-foreground ml-auto">
            {lead.giorni_aperto}gg
          </span>
        )}
      </div>
    </div>
  )
}
