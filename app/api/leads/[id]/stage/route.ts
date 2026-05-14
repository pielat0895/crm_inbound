import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { stadio_pipeline } = await request.json()

  if (!stadio_pipeline || typeof stadio_pipeline !== 'string') {
    return NextResponse.json({ error: 'stadio_pipeline required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('leads')
    .update({ stadio_pipeline })
    .eq('id', id)
    .select('id, stadio_pipeline')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
