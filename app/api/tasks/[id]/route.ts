import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { pickTaskFields, validateTaskInput } from '@/lib/task-fields'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = pickTaskFields(await request.json())

  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }
  const invalid = validateTaskInput(body)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  // done_at segue done: lo decide il server, non il client.
  if (body.done === true) body.done_at = new Date().toISOString()
  if (body.done === false) body.done_at = null

  const supabase = createServiceClient()
  const { data, error } = await supabase.from('tasks').update(body).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
