export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields } from '@/types'
import { leadARischio } from '@/lib/tasks'
import { DaSistemareTablePreview } from '@/components/leads-preview/DaSistemareTablePreview'
import { PreviewShell } from '@/components/preview/PreviewShell'
import Link from 'next/link'
import { ORANGE, GRAY_500 } from '@/components/dashboard-preview/tokens'

export default async function DaSistemarePreviewPage() {
  const settings = await getSettings()
  const supabase = createServiceClient()

  const { data: leads, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('stadio_pipeline', 'Da sistemare')
    .order('created_at', { ascending: false })

  const now = new Date()
  const computed = (leads ?? []).map(l => computeLeadFields(l, now))

  const { data: allLeadRows } = await supabase.from('leads').select('*')
  const allComputed = (allLeadRows ?? []).map(l => computeLeadFields(l, now))
  const rischio = leadARischio(allComputed, now, settings.followup_threshold_days)

  return (
    <PreviewShell
      pageLabel="MIGRAZIONE DATI"
      titleAccent="DA"
      titleRest="SISTEMARE"
      headerStats={[{ value: String(count ?? 0), label: 'DA ASSEGNARE', color: ORANGE }]}
      footerNote={`${allComputed.length} lead · ${rischio.length} follow-up scaduti`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Link
          href="/leads-preview"
          style={{ alignSelf: 'flex-start', font: "600 11px/1 'Open Sans'", letterSpacing: '.1em', color: GRAY_500, textDecoration: 'none' }}
        >
          ← TORNA AI LEAD
        </Link>
        <p style={{ margin: 0, font: "400 13px/1.6 'Open Sans'", color: GRAY_500, maxWidth: 640 }}>
          Lead con stadio pipeline non recuperato dalla migrazione dati. Assegna lo stadio corretto: la riga sparisce appena salvata.
        </p>
        <DaSistemareTablePreview leads={computed} stages={settings.pipeline_stages} threshold={settings.followup_threshold_days} />
      </div>
    </PreviewShell>
  )
}
