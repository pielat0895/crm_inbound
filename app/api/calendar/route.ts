// app/api/calendar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createReminderEvent } from '@/lib/calendar'

export async function POST(request: NextRequest) {
  const { lead_id } = await request.json()
  if (!lead_id) return NextResponse.json({ error: 'lead_id required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: lead, error } = await supabase
    .from('leads').select('nome, cognome, azienda, ricontattare').eq('id', lead_id).single()

  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  if (!lead.ricontattare) return NextResponse.json({ error: 'ricontattare date not set' }, { status: 400 })

  const name = [lead.nome, lead.cognome].filter(Boolean).join(' ') || lead.azienda || 'Lead'
  const summary = `Ricontattare: ${name}${lead.azienda ? ` — ${lead.azienda}` : ''}`
  const leadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/leads/${lead_id}`

  await createReminderEvent({ summary, date: lead.ricontattare, leadUrl })

  return NextResponse.json({ ok: true })
}
