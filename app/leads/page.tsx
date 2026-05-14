export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields } from '@/types'
import { LeadTable } from '@/components/leads/LeadTable'

export default async function LeadsPage() {
  const supabase = createServiceClient()
  const [{ data: leads }, settings] = await Promise.all([
    supabase.from('leads').select('*').order('created_at', { ascending: false }),
    getSettings(),
  ])

  const computed = (leads ?? []).map(l => computeLeadFields(l))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Lead</h1>
      <LeadTable leads={computed} threshold={settings.followup_threshold_days} />
    </div>
  )
}
