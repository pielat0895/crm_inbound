import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { computeLeadFields } from '@/types'
import { pickLeadFields } from '@/lib/lead-fields'
import { sanitizeSearchTerm } from '@/lib/search'
import { isActiveLead } from '@/lib/tasks'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const stage = searchParams.get('stage')
  const origine = searchParams.get('origine')
  const q = sanitizeSearchTerm(searchParams.get('q'))

  const supabase = createServiceClient()
  let query = supabase.from('leads').select('*').order('created_at', { ascending: false })

  if (stage) query = query.eq('stadio_pipeline', stage)
  if (origine) query = query.eq('origine', origine)
  if (q) query = query.or(`nome.ilike.%${q}%,cognome.ilike.%${q}%,azienda.ilike.%${q}%,email.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const activeLeads = (data ?? [])
    .map(l => computeLeadFields(l))
    .filter(isActiveLead)
    .filter(l => l.stadio_pipeline !== 'Da sistemare')
  return NextResponse.json(activeLeads)
}

export async function POST(request: NextRequest) {
  const body = pickLeadFields(await request.json())

  if (!body.email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('leads')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(computeLeadFields(data), { status: 201 })
}
