import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function DELETE() {
  const supabase = createServiceClient()

  // interactions hanno FK su leads con CASCADE, ma cancelliamo esplicitamente per sicurezza
  await supabase.from('interactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  const { error } = await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
