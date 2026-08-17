'use client'
import { useState } from 'react'
import { LeadForm } from '@/components/leads/LeadForm'
import { NoteTabPreview } from './NoteTabPreview'
import { InteractionTimelinePreview } from './InteractionTimelinePreview'
import type { LeadWithComputed, Interaction } from '@/types'
import { PLUM, ORANGE, GRAY_150, GRAY_BORDER, GRAY_500 } from '@/components/dashboard-preview/tokens'

type Tab = 'dettagli' | 'note' | 'hubspot'

type Props = {
  lead: LeadWithComputed
  interactions: Interaction[]
  stages: string[]
}

export function LeadDetailTabsPreview({ lead, interactions, stages }: Props) {
  const [tab, setTab] = useState<Tab>('dettagli')

  function tabStyle(t: Tab): React.CSSProperties {
    const active = tab === t
    return {
      border: 'none', cursor: 'pointer', padding: '11px 20px',
      background: active ? PLUM : GRAY_150, color: active ? '#fff' : GRAY_500,
      font: "700 11px/1 'Open Sans'", letterSpacing: '.12em',
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]" style={{ gap: 34, alignItems: 'start' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', borderBottom: `2px solid ${PLUM}` }}>
          <button onClick={() => setTab('dettagli')} style={tabStyle('dettagli')}>DETTAGLI</button>
          <button onClick={() => setTab('note')} style={tabStyle('note')}>NOTE</button>
          <button onClick={() => setTab('hubspot')} style={tabStyle('hubspot')}>HUBSPOT · PRESTO</button>
        </div>

        {tab === 'dettagli' && (
          <div style={{ background: '#fff', border: `1px solid ${GRAY_BORDER}`, borderTop: 'none', padding: 26 }}>
            <LeadForm lead={lead} stages={stages} hideNote />
          </div>
        )}

        {tab === 'note' && <NoteTabPreview leadId={lead.id} initialNote={lead.note} />}

        {tab === 'hubspot' && (
          <div style={{ background: '#fff', border: `1px solid ${GRAY_BORDER}`, borderTop: 'none', padding: 26 }}>
            <p style={{ margin: '0 0 10px', font: "700 11px/1 'Open Sans'", letterSpacing: '.12em', color: ORANGE }}>
              SINCRONIZZAZIONE HUBSPOT
            </p>
            <p style={{ margin: '0 0 18px', font: "400 13px/1.6 'Open Sans'", maxWidth: 520 }}>
              Contatto non ancora sincronizzato. Si attiverà automaticamente quando il lead raggiungerà Proposal Sent o uno stadio successivo.
            </p>
            <button
              disabled
              style={{ height: 34, padding: '0 16px', border: `1px solid ${GRAY_BORDER}`, background: '#EEEEEE', color: GRAY_500, font: "600 11px/1 'Open Sans'", letterSpacing: '.08em', cursor: 'not-allowed' }}
            >
              COLLEGA MANUALMENTE
            </button>
          </div>
        )}
      </div>

      <aside style={{ background: GRAY_150, padding: 24 }}>
        <InteractionTimelinePreview leadId={lead.id} interactions={interactions} />
      </aside>
    </div>
  )
}
