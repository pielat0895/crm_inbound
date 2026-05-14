import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { mapInboundPayload, validateSecret } from '@/lib/webhook-mapping'

export async function POST(request: NextRequest) {
  if (!validateSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const raw = await request.json()
  const payload = mapInboundPayload(raw)

  if (!payload.email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
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
