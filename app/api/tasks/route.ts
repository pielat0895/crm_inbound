import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { pickTaskFields, validateTaskInput } from '@/lib/task-fields'

export async function POST(request: NextRequest) {
  const body = pickTaskFields(await request.json())

  if (!body.titolo) {
    return NextResponse.json({ error: 'titolo obbligatorio' }, { status: 400 })
  }
  const invalid = validateTaskInput(body)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase.from('tasks').insert(body).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
