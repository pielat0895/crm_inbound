export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields } from '@/types'
import { isActiveLead } from '@/lib/tasks'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'

export default async function PipelinePage() {
  const supabase = createServiceClient()
  const [{ data: leads }, settings] = await Promise.all([
    supabase.from('leads').select('*'),
    getSettings(),
  ])

  const computed = (leads ?? []).map(l => computeLeadFields(l)).filter(isActiveLead)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pipeline</h1>
      <KanbanBoard
        initialLeads={computed}
        stages={settings.pipeline_stages}
        threshold={settings.followup_threshold_days}
      />
    </div>
  )
}
