import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sanitizeSearchTerm } from '@/lib/search'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const q = sanitizeSearchTerm(req.nextUrl.searchParams.get('q'))
  if (!q || q.length < 2) return NextResponse.json([])

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('leads')
    .select('id, nome, cognome, azienda, email, stadio_pipeline, origine')
    .or(`nome.ilike.%${q}%,cognome.ilike.%${q}%,azienda.ilike.%${q}%,email.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json(data ?? [])
}
