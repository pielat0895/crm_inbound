'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import type { LeadWithComputed } from '@/types'

export function CalendarButton({ lead }: { lead: LeadWithComputed }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function createEvent() {
    setLoading(true)
    await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: lead.id }),
    })
    setDone(true)
    setLoading(false)
  }

  return (
    <Button variant="outline" size="sm" onClick={createEvent} disabled={loading || done}>
      <Calendar className="h-4 w-4 mr-1" />
      {done ? 'Evento creato' : loading ? '...' : 'Crea reminder Calendar'}
    </Button>
  )
}
