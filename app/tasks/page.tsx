export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields } from '@/types'
import type { Lead, Task } from '@/types'
import { buildTaskFeed, toDateString } from '@/lib/tasks'
import { TaskFeedView } from '@/components/tasks/TaskFeedView'

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Da fare</h1>
        <p className="text-sm text-muted-foreground">Scadenze, follow-up e deal da presidiare.</p>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
        <TaskFeedView feed={feed} today={toDateString(now)} owners={owners} filters={filters} />
      </Suspense>
    </div>
  )
}
