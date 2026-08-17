import { getSettings } from '@/lib/settings'
import { createServiceClient } from '@/lib/supabase/server'
import { computeLeadFields } from '@/types'
import { leadARischio } from '@/lib/tasks'
import { LeadForm } from '@/components/leads/LeadForm'
import { PreviewShell } from '@/components/preview/PreviewShell'
import { GRAY_BORDER } from '@/components/dashboard-preview/tokens'

export default async function NewLeadPage() {
  const settings = await getSettings()
  const supabase = createServiceClient()
  const { data: leadRows } = await supabase.from('leads').select('*')

  const now = new Date()
  const leads = (leadRows ?? []).map(l => computeLeadFields(l, now))
  const rischio = leadARischio(leads, now, settings.followup_threshold_days)

  return (
    <PreviewShell
      pageLabel="ANAGRAFICA"
      titleAccent="NUOVO"
      titleRest="LEAD"
      footerNote={`${leads.length} lead · ${rischio.length} follow-up scaduti`}
    >
      <div style={{ background: '#fff', border: `1px solid ${GRAY_BORDER}`, padding: 26, maxWidth: 760 }}>
        <LeadForm stages={settings.pipeline_stages} />
      </div>
    </PreviewShell>
  )
}
