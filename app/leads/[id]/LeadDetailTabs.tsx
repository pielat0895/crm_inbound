'use client'
import { useState } from 'react'
import { LeadForm } from '@/components/leads/LeadForm'
import { InteractionTimeline } from '@/components/leads/InteractionTimeline'
import { NoteTab } from './NoteTab'
import type { LeadWithComputed, Interaction } from '@/types'

type Tab = 'dettagli' | 'note' | 'hubspot'

type Props = {
  lead: LeadWithComputed
  interactions: Interaction[]
  stages: string[]
}

function tabClass(active: boolean) {
  return `rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
    active ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
  }`
}

export function LeadDetailTabs({ lead, interactions, stages }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('dettagli')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
      {/* Left column: pill tabs + content */}
      <div>
        {/* Pill tabs */}
        <div role="tablist" aria-label="Sezioni lead" className="inline-flex bg-muted rounded-full p-1 mb-6">
          <button
            role="tab"
            aria-selected={activeTab === 'dettagli'}
            type="button"
            onClick={() => setActiveTab('dettagli')}
            className={tabClass(activeTab === 'dettagli')}
          >
            Dettagli
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'note'}
            type="button"
            onClick={() => setActiveTab('note')}
            className={tabClass(activeTab === 'note')}
          >
            Note
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'hubspot'}
            type="button"
            onClick={() => setActiveTab('hubspot')}
            className={`${tabClass(activeTab === 'hubspot')} flex items-center gap-1.5`}
          >
            HubSpot
            <span aria-hidden="true" className="text-xs bg-indigo-100 text-indigo-600 rounded px-1.5 py-0.5 leading-none">
              presto
            </span>
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'dettagli' && (
          <LeadForm lead={lead} stages={stages} hideNote />
        )}
        {activeTab === 'note' && (
          <NoteTab leadId={lead.id} initialNote={lead.note} />
        )}
        {activeTab === 'hubspot' && (
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔗</span>
              <span className="font-semibold">HubSpot</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Contatto non ancora sincronizzato. Si attiverà automaticamente quando il lead
              raggiungerà Proposal Sent+.
            </p>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="text-sm px-4 py-2 rounded-md border bg-muted text-muted-foreground cursor-not-allowed"
            >
              Collega manualmente
            </button>
          </div>
        )}
      </div>

      {/* Right column: timeline always visible */}
      <div className="lg:sticky lg:top-6">
        <InteractionTimeline leadId={lead.id} interactions={interactions} />
      </div>
    </div>
  )
}
