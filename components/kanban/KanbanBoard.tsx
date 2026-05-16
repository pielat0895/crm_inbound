'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { KanbanCard } from './KanbanCard'
import type { LeadWithComputed } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Search, Inbox } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

type Props = {
  initialLeads: LeadWithComputed[]
  stages: string[]
  threshold: number
}

function DroppableColumn({
  stage, leads, threshold, hasSearch,
}: { stage: string; leads: LeadWithComputed[]; threshold: number; hasSearch: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 min-h-32 rounded-lg border-2 p-1 transition-colors ${isOver ? 'border-primary bg-primary/5' : 'border-transparent'}`}
    >
      {leads.map(lead => (
        <KanbanCard key={lead.id} lead={lead} threshold={threshold} />
      ))}
      {leads.length === 0 && !hasSearch && (
        <div className="py-6">
          <EmptyState
            icon={Inbox}
            title="Nessun lead"
            description="Trascina qui un lead o aggiungine uno nuovo."
          />
        </div>
      )}
    </div>
  )
}

export function KanbanBoard({ initialLeads, stages, threshold }: Props) {
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

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, async () => {
        const res = await fetch('/api/leads')
        const updated: LeadWithComputed[] = await res.json()
        setLeads(updated)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
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

    // over.id può essere un nome stage (colonna droppable) o un UUID card (sortable item)
    const newStage = stages.includes(overId)
      ? overId
      : leads.find(l => l.id === overId)?.stadio_pipeline

    if (!newStage) return

    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.stadio_pipeline === newStage) return

    setLeads(prev =>
      prev.map(l => l.id === leadId ? { ...l, stadio_pipeline: newStage } : l)
    )

    await fetch(`/api/leads/${leadId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stadio_pipeline: newStage }),
    })
  }, [leads, stages])

  const activeLead = leads.find(l => l.id === activeId) ?? null

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca nome, azienda, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => {
          const stageLeads = visibleLeads.filter(l => l.stadio_pipeline === stage)
          return (
            <div key={stage} className="flex-shrink-0 w-64">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">{stage}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {stageLeads.length}
                </span>
              </div>
              <SortableContext
                items={stageLeads.map(l => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <DroppableColumn stage={stage} leads={stageLeads} threshold={threshold} hasSearch={!!search.trim()} />
              </SortableContext>
            </div>
          )
        })}
      </div>
      <DragOverlay>
        {activeLead && <KanbanCard lead={activeLead} threshold={threshold} />}
      </DragOverlay>
    </DndContext>
    </div>
  )
}
