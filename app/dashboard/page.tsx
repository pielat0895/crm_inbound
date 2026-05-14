export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { StatsCard } from '@/components/ui/StatsCard'
import { computeLeadFields, CLOSED_STAGES } from '@/types'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export default async function DashboardPage() {
  const supabase = createServiceClient()
  const [{ data: leads }, settings] = await Promise.all([
    supabase.from('leads').select('*'),
    getSettings(),
  ])

  const allLeads = (leads ?? []).map(l => computeLeadFields(l))
  const openLeads = allLeads.filter(l => !CLOSED_STAGES.includes(l.stadio_pipeline))
  const wonLeads = allLeads.filter(l => l.stadio_pipeline === 'Vinto')
  const conversionRate = allLeads.length > 0
    ? Math.round((wonLeads.length / allLeads.length) * 100)
    : 0

  const avgDaysToClose = wonLeads.filter(l => l.giorni_aperto !== null).length > 0
    ? Math.round(wonLeads.reduce((sum, l) => sum + (l.giorni_aperto ?? 0), 0) / wonLeads.length)
    : 0

  const overdue = openLeads.filter(
    l => l.giorni_ultimo_contatto !== null && l.giorni_ultimo_contatto >= settings.followup_threshold_days
  )

  const today = new Date().toISOString().split('T')[0]
  const todayFollowups = openLeads.filter(l => l.ricontattare === today)

  const leadsByStage = settings.pipeline_stages.map(stage => ({
    stage,
    count: openLeads.filter(l => l.stadio_pipeline === stage).length,
  }))

  const leadsByOrigine: Record<string, number> = {}
  for (const lead of openLeads) {
    if (lead.origine) leadsByOrigine[lead.origine] = (leadsByOrigine[lead.origine] ?? 0) + 1
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard title="Lead aperti" value={openLeads.length} />
        <StatsCard title="Tasso conversione" value={`${conversionRate}%`} subtitle={`${wonLeads.length} vinti`} />
        <StatsCard title="Giorni medi chiusura" value={avgDaysToClose} />
        <StatsCard title="Scaduti follow-up" value={overdue.length} subtitle={`soglia: ${settings.followup_threshold_days}gg`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-3">Lead per stadio</h2>
          <div className="space-y-2">
            {leadsByStage.map(({ stage, count }) => (
              <div key={stage} className="flex justify-between text-sm">
                <span>{stage}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-3">Lead per origine</h2>
          <div className="space-y-2">
            {Object.entries(leadsByOrigine).map(([origine, count]) => (
              <div key={origine} className="flex justify-between text-sm">
                <span>{origine}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <h2 className="font-semibold text-orange-800 mb-3">
            Da ricontattare ({overdue.length})
          </h2>
          <div className="space-y-1">
            {overdue.slice(0, 10).map(lead => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="flex justify-between text-sm hover:underline">
                <span>{lead.nome} {lead.cognome} — {lead.azienda}</span>
                <span className="text-orange-600">{lead.giorni_ultimo_contatto}gg fa</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {todayFollowups.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h2 className="font-semibold text-blue-800 mb-3">Follow-up oggi ({todayFollowups.length})</h2>
          <div className="space-y-1">
            {todayFollowups.map(lead => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="block text-sm hover:underline">
                {lead.nome} {lead.cognome} — {lead.azienda}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
