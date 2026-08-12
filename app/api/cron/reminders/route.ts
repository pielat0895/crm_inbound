// app/api/cron/reminders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields, STATO_TERMINALI } from '@/types'
import { sendOverdueDigest } from '@/lib/email'
import { leadARischio } from '@/lib/tasks'

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('authorization')
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const [{ data: leads }, settings] = await Promise.all([
    supabase.from('leads').select('*').or(`stato.is.null,stato.not.in.(${STATO_TERMINALI.map(s => `"${s}"`).join(',')})`),
    getSettings(),
  ])

  const computed = (leads ?? []).map(l => computeLeadFields(l))
  const overdue = leadARischio(computed, new Date(), settings.followup_threshold_days)

  try {
    await sendOverdueDigest(overdue)
  } catch (err) {
    console.error('[cron/reminders] Failed to send digest:', err)
  }

  return NextResponse.json({ sent: overdue.length })
}
