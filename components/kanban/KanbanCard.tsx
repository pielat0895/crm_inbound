'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { OverdueBadge } from '@/components/ui/OverdueBadge'
import type { LeadWithComputed } from '@/types'
import { useRouter } from 'next/navigation'

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => router.push(`/leads/${lead.id}`)}
      className="rounded-md border bg-card p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow space-y-1"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm leading-tight">
          {lead.nome} {lead.cognome}
        </p>
        <OverdueBadge giorni={lead.giorni_ultimo_contatto} threshold={threshold} />
      </div>
      {lead.azienda && <p className="text-xs text-muted-foreground">{lead.azienda}</p>}
      <div className="flex gap-2 flex-wrap">
        {lead.origine && (
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{lead.origine}</span>
        )}
        {lead.data_ultimo_contatto && (
          <span className="text-xs text-muted-foreground">
            {new Date(lead.data_ultimo_contatto).toLocaleDateString('it-IT')}
          </span>
        )}
      </div>
    </div>
  )
}
