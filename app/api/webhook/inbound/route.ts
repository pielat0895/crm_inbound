import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { mapInboundPayload, validateSecret } from '@/lib/webhook-mapping'
import { DEFAULT_PIPELINE_STAGES, STATO_OPTIONS } from '@/types'

export async function POST(request: NextRequest) {
  if (!validateSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const raw = await request.json()
  const payload = mapInboundPayload(raw)

  if (!payload.email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  // Drop unknown stadio_pipeline/stato values rather than letting them hit
  // the DB CHECK constraint and surface as a raw Postgres 500. Legacy n8n
  // workflows can still send stale vocabulary values.
  if (payload.stadio_pipeline !== undefined && !DEFAULT_PIPELINE_STAGES.includes(payload.stadio_pipeline as string)) {
    delete payload.stadio_pipeline
  }
  if (payload.stato !== undefined && !STATO_OPTIONS.includes(payload.stato as string)) {
    delete payload.stato
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('leads')
    .upsert(payload, { onConflict: 'email', ignoreDuplicates: false })
    .select('id, email, stadio_pipeline')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id }, { status: 200 })
}
