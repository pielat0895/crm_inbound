import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Operazione distruttiva: richiede conferma esplicita nel body per evitare
// trigger accidentali o CSRF banali con cookie valido.
export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (body?.confirm !== 'RESET') {
    return NextResponse.json({ error: 'Confirmation required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // interactions hanno FK su leads con CASCADE, ma cancelliamo esplicitamente per sicurezza
  await supabase.from('interactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  const { error } = await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
