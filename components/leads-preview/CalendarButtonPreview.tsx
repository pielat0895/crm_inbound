'use client'
import { useState } from 'react'
import type { LeadWithComputed } from '@/types'
import { PLUM } from '@/components/dashboard-preview/tokens'

export function CalendarButtonPreview({ lead }: { lead: LeadWithComputed }) {
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
    <button
      onClick={createEvent}
      disabled={loading || done}
      style={{ height: 32, padding: '0 14px', border: `1px solid ${PLUM}`, background: '#fff', font: "600 11px/1 'Open Sans'", letterSpacing: '.08em', cursor: loading || done ? 'default' : 'pointer' }}
    >
      {done ? 'EVENTO CREATO' : loading ? '...' : 'CALENDARIO'}
    </button>
  )
}
