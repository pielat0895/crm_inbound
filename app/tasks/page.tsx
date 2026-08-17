export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields } from '@/types'
import type { Lead, Task } from '@/types'
import { buildTaskFeed, toDateString, leadARischio } from '@/lib/tasks'
import { PreviewShell } from '@/components/preview/PreviewShell'
import { TaskFeedPreview } from '@/components/tasks-preview/TaskFeedPreview'
import { ORANGE } from '@/components/dashboard-preview/tokens'

function intParam(value: string | undefined, fallback: number): number {
  const n = parseInt(value ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ upcoming?: string; closing?: string; dormant?: string; owner?: string }>
}) {
  const sp = await searchParams
  const supabase = createServiceClient()

  const [{ data: leadRows, error: leadsError }, { data: taskRows, error: tasksError }, settings] = await Promise.all([
    supabase.from('leads').select('*'),
    supabase.from('tasks').select('*').eq('done', false),
    getSettings(),
  ])

  if (leadsError || tasksError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
        <p className="text-sm font-medium text-destructive">Errore nel caricamento</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {leadsError?.message ?? tasksError?.message}
        </p>
      </div>
    )
  }

  const now = new Date()
  const leads = ((leadRows ?? []) as Lead[]).map(l => computeLeadFields(l, now))
  const tasks = (taskRows ?? []) as Task[]

  const filters = {
    upcomingDays: intParam(sp.upcoming, 7),
    closingDays: intParam(sp.closing, 30),
    dormantDays: intParam(sp.dormant, settings.followup_threshold_days),
    owner: sp.owner || null,
  }

  const feed = buildTaskFeed(leads, tasks, settings, filters, now)
  const owners = [...new Set(leads.map(l => l.owner).filter((o): o is string => !!o))].sort()
  const rischio = leadARischio(leads, now, settings.followup_threshold_days)
  const inChiusuraValore = feed.prossimiChiusura.reduce((sum, item) => sum + (item.valore ?? 0), 0)

  const stageBars = settings.pipeline_stages.map(stage => ({
    stage,
    count: leads.filter(l => l.stadio_pipeline === stage).length,
  }))

  const todayLabel = now
    .toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .toUpperCase()

  return (
    <PreviewShell
      pageLabel={todayLabel}
      titleAccent="LA TUA"
      titleRest="GIORNATA"
      headerStats={[
        { value: String(feed.daFareOra.length), label: 'DA FARE ORA' },
        { value: String(rischio.length), label: 'A RISCHIO', color: ORANGE },
        { value: `€${inChiusuraValore.toLocaleString('it-IT')}`, label: `IN CHIUSURA ${filters.closingDays}GG`, color: ORANGE },
      ]}
      footerNote={`${leads.length} lead · ${rischio.length} follow-up scaduti`}
    >
      <Suspense fallback={<p style={{ fontSize: 13, color: '#868686' }}>Caricamento…</p>}>
        <TaskFeedPreview
          feed={feed}
          today={toDateString(now)}
          owners={owners}
          filters={filters}
          stageBars={stageBars}
        />
      </Suspense>
    </PreviewShell>
  )
}
