import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 40),
    service_key_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    leads_count: count,
    error: error?.message ?? null,
  })
}
