export const dynamic = 'force-dynamic'

import { getSettings } from '@/lib/settings'
import { createServiceClient } from '@/lib/supabase/server'
import { computeLeadFields } from '@/types'
import { leadARischio } from '@/lib/tasks'
import { PreviewShell } from '@/components/preview/PreviewShell'
import { SettingsFormPreview } from '@/components/settings-preview/SettingsFormPreview'
import { BLUE } from '@/components/dashboard-preview/tokens'

export default async function SettingsPreviewPage() {
  const settings = await getSettings()
  const supabase = createServiceClient()
  const { data: leadRows } = await supabase.from('leads').select('*')

  const now = new Date()
  const leads = (leadRows ?? []).map(l => computeLeadFields(l, now))
  const rischio = leadARischio(leads, now, settings.followup_threshold_days)

  return (
    <PreviewShell
      pageLabel="CONFIGURAZIONE"
      titleAccent="IMPOSTAZIONI"
      titleRest="DEL CRM"
      headerStats={[
        { value: String(settings.followup_threshold_days), label: 'SOGLIA GIORNI' },
        { value: String(settings.pipeline_stages.length), label: 'STADI CONFIGURATI', color: BLUE },
      ]}
      footerNote={`${leads.length} lead · ${rischio.length} follow-up scaduti`}
    >
      <SettingsFormPreview initialSettings={settings} />
    </PreviewShell>
  )
}
