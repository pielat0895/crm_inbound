'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRouter } from 'next/navigation'
import type { LeadWithComputed } from '@/types'
import { PLUM, ORANGE, GRAY_BORDER, GRAY_100, GRAY_500, STAGE_COLORS } from '@/components/dashboard-preview/tokens'

type Props = {
  lead: LeadWithComputed
  threshold: number
}

export function KanbanCardPreview({ lead, threshold }: Props) {
  const router = useRouter()
  const isVinto = lead.stato === 'Vinto'
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { lead },
    disabled: isVinto,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const overdue = lead.giorni_ultimo_contatto !== null && lead.giorni_ultimo_contatto >= threshold
  const ruleColor = isVinto ? '#2f9e6a' : (overdue ? ORANGE : (STAGE_COLORS[lead.stadio_pipeline] ?? PLUM))

  return (
    <button
      ref={setNodeRef}
      style={{
        ...style,
        display: 'block', textAlign: 'left', width: '100%', background: '#fff', border: 'none',
        borderLeft: `3px solid ${ruleColor}`, padding: 14, cursor: 'pointer',
      }}
      {...attributes}
      {...listeners}
      onClick={() => router.push(`/leads/${lead.id}`)}
      className="hover:bg-[#fbfaf9]"
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <p style={{ margin: 0, font: "600 14px/1.3 'Open Sans'" }}>{lead.nome} {lead.cognome}</p>
        {overdue && !isVinto && (
          <span style={{ font: "700 10px/1.2 'Open Sans'", letterSpacing: '.08em', color: ORANGE }}>
            {lead.giorni_ultimo_contatto}G SENZA CONTATTO
          </span>
        )}
        {isVinto && (
          <span style={{ font: "700 10px/1.2 'Open Sans'", letterSpacing: '.08em', color: '#2f9e6a' }}>VINTO</span>
        )}
      </div>
      {(lead.azienda || lead.dipendenti) && (
        <p style={{ margin: '5px 0 0', font: "400 12px/1.4 'Open Sans'", color: GRAY_500 }}>
          {lead.azienda}{lead.azienda && lead.dipendenti ? ' · ' : ''}{lead.dipendenti && `${lead.dipendenti} dip.`}
        </p>
      )}
      {lead.note && (
        <p style={{ margin: '8px 0 0', font: "400 12px/1.45 'Open Sans'", color: GRAY_500, paddingLeft: 9, borderLeft: `1px solid ${GRAY_BORDER}` }}>
          {lead.note.length > 90 ? `${lead.note.slice(0, 90)}…` : lead.note}
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${GRAY_100}` }}>
        <span style={{ font: "700 14px/1 'Open Sans'" }}>{lead.valore ? `€${lead.valore.toLocaleString('it-IT')}` : '—'}</span>
        {lead.origine && (
          <span style={{ font: "600 9px/1.3 'Open Sans'", letterSpacing: '.1em', color: GRAY_500 }}>{lead.origine.toUpperCase()}</span>
        )}
        {lead.giorni_aperto !== null && (
          <span style={{ marginLeft: 'auto', font: "400 11px/1 'Open Sans'", color: GRAY_500 }}>{lead.giorni_aperto}gg</span>
        )}
      </div>
    </button>
  )
}
