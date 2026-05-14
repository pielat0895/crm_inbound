import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateSecret } from '@/lib/webhook-mapping'

type EngagementItem = {
  email: string
  data_ultimo_contatto?: string
  risposto_ultima_mail?: boolean
  touchpoints?: number
}

export async function PATCH(request: NextRequest) {
  if (!validateSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const items: EngagementItem[] = await request.json()
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'Expected array' }, { status: 400 })
  }

  const supabase = createServiceClient()
  let updated = 0
  let skipped = 0

  for (const item of items) {
    if (!item.email) { skipped++; continue }

    const patch: Record<string, unknown> = {}
    if (item.data_ultimo_contatto !== undefined) patch.data_ultimo_contatto = item.data_ultimo_contatto
    if (item.risposto_ultima_mail !== undefined) patch.risposto_ultima_mail = item.risposto_ultima_mail
    if (item.touchpoints !== undefined) patch.touchpoints = item.touchpoints

    const { error, count } = await supabase
      .from('leads')
      .update(patch)
      .eq('email', item.email)

    if (!error && count && count > 0) updated++
    else skipped++
  }

  return NextResponse.json({ updated, skipped })
}
