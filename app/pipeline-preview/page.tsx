export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields } from '@/types'
import { isActiveLead, leadARischio } from '@/lib/tasks'
import { KanbanBoardPreview } from '@/components/kanban-preview/KanbanBoardPreview'
import { PreviewShell } from '@/components/preview/PreviewShell'
import { ORANGE } from '@/components/dashboard-preview/tokens'

export default async function PipelinePreviewPage() {
  const supabase = createServiceClient()
  const [{ data: leads }, settings] = await Promise.all([
    supabase.from('leads').select('*'),
    getSettings(),
  ])

  const now = new Date()
  const allComputed = (leads ?? []).map(l => computeLeadFields(l, now))

  // Attivi + Vinto: i deal chiusi vinti restano visibili nella loro colonna
  // finale (congelata), sola lettura. Gli altri esiti terminali restano fuori dal board.
  const computed = allComputed
    .filter(l => isActiveLead(l) || l.stato === 'Vinto')
    .filter(l => l.stadio_pipeline !== 'Da sistemare')

  const pipelineValue = computed
    .filter(l => isActiveLead(l))
    .reduce((sum, l) => sum + (l.valore ?? 0), 0)

  const rischio = leadARischio(allComputed, now, settings.followup_threshold_days)

  return (
    <PreviewShell
      pageLabel="PIPELINE COMMERCIALE"
      titleAccent="DOVE SONO"
      titleRest="I DEAL"
      headerStats={[
        { value: String(computed.length), label: 'LEAD IN BOARD' },
        { value: `€${pipelineValue.toLocaleString('it-IT')}`, label: 'VALORE APERTO', color: ORANGE },
      ]}
      footerNote={`${allComputed.length} lead · ${rischio.length} follow-up scaduti`}
    >
      <KanbanBoardPreview
        initialLeads={computed}
        stages={settings.pipeline_stages}
        threshold={settings.followup_threshold_days}
      />
    </PreviewShell>
  )
}
