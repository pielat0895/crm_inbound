'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners, useDroppable,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanCardPreview } from './KanbanCardPreview'
import type { LeadWithComputed } from '@/types'
import { PLUM, GRAY_BORDER, GRAY_500, STAGE_COLORS } from '@/components/dashboard-preview/tokens'

type Props = {
  initialLeads: LeadWithComputed[]
  stages: string[]
  threshold: number
}

function DroppableColumnPreview({
  stage, leads, threshold,
}: { stage: string; leads: LeadWithComputed[]; threshold: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  return (
    <div
      ref={setNodeRef}
      style={{
        padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 420,
        outline: isOver ? `2px solid ${STAGE_COLORS[stage] ?? PLUM}` : 'none',
        outlineOffset: -2,
      }}
    >
      {leads.map(lead => (
        <KanbanCardPreview key={lead.id} lead={lead} threshold={threshold} />
      ))}
      {leads.length === 0 && (
        <p style={{ margin: 0, padding: '20px 0', font: "400 12px/1.4 'Open Sans'", color: GRAY_500, textAlign: 'center' }}>
          Nessun lead. Trascina qui una scheda.
        </p>
      )}
    </div>
  )
}

export function KanbanBoardPreview({ initialLeads, stages, threshold }: Props) {
  const [leads, setLeads] = useState<LeadWithComputed[]>(initialLeads)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const visibleLeads = search.trim()
    ? leads.filter(l => {
        const q = search.toLowerCase()
        return (
          l.nome?.toLowerCase().includes(q) ||
          l.cognome?.toLowerCase().includes(q) ||
          l.azienda?.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q)
        )
      })
    : leads

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Polling: RLS deny-all ha rimosso l'accesso realtime del client anon
  useEffect(() => {
    const refetch = async () => {
      if (document.hidden) return
      const res = await fetch('/api/leads')
      if (!res.ok) return
      const updated: LeadWithComputed[] = await res.json()
      setLeads(updated)
    }
    const interval = setInterval(refetch, 30_000)
    window.addEventListener('focus', refetch)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', refetch)
    }
  }, [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const leadId = active.id as string
    const overId = over.id as string

    const newStage = stages.includes(overId)
      ? overId
      : leads.find(l => l.id === overId)?.stadio_pipeline

    if (!newStage) return

    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.stadio_pipeline === newStage) return

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stadio_pipeline: newStage } : l))

    await fetch(`/api/leads/${leadId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stadio_pipeline: newStage }),
    })
  }, [leads, stages])

  const activeLead = leads.find(l => l.id === activeId) ?? null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <input
          placeholder="Cerca nome, azienda, email"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 300, height: 34, border: `1px solid ${GRAY_BORDER}`, background: '#fff', padding: '0 12px', font: "400 13px/1 'Open Sans'" }}
        />
        <span style={{ font: "400 12px/1 'Open Sans'", color: GRAY_500 }}>trascina una scheda per cambiare stadio</span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 1, overflowX: 'auto', background: GRAY_BORDER, border: `1px solid ${GRAY_BORDER}` }}>
          {stages.map(stage => {
            const stageLeads = visibleLeads.filter(l => l.stadio_pipeline === stage)
            const color = STAGE_COLORS[stage] ?? PLUM
            return (
              <div key={stage} style={{ flex: 1, minWidth: 250, background: '#EEEEEE', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 16px', background: '#fff', borderBottom: `1px solid ${GRAY_BORDER}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 12, height: 12, flex: 'none', transform: 'rotate(45deg)', background: color }} />
                  <span style={{ font: "700 11px/1 'Open Sans'", letterSpacing: '.1em' }}>{stage.toUpperCase()}</span>
                  <span style={{ marginLeft: 'auto', font: "700 14px/1 'Open Sans'", color: GRAY_500 }}>{stageLeads.length}</span>
                </div>
                <SortableContext items={stageLeads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                  <DroppableColumnPreview stage={stage} leads={stageLeads} threshold={threshold} />
                </SortableContext>
              </div>
            )
          })}
        </div>
        <DragOverlay>
          {activeLead && <KanbanCardPreview lead={activeLead} threshold={threshold} />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
