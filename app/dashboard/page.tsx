export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { StatsCard } from '@/components/ui/StatsCard'
import { computeLeadFields, CLOSED_STAGES } from '@/types'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Users, TrendingUp, Clock, AlertCircle } from 'lucide-react'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { PipelineChart } from '@/components/dashboard/PipelineChart'
import { ConversionChart } from '@/components/dashboard/ConversionChart'

export default async function DashboardPage() {
  const supabase = createServiceClient()
  const [{ data: leads }, settings] = await Promise.all([
    supabase.from('leads').select('*'),
    getSettings(),
  ])

  const allLeads = (leads ?? []).map(l => computeLeadFields(l))
  const openLeads = allLeads.filter(l => !CLOSED_STAGES.includes(l.stadio_pipeline))
  const wonLeads = allLeads.filter(l => l.stadio_pipeline === 'Chiuso (Vinto)')
  const conversionRate = allLeads.length > 0
    ? Math.round((wonLeads.length / allLeads.length) * 100)
    : 0

  const wonWithDays = wonLeads.filter(l => l.giorni_pipeline !== null)
  const avgDaysToClose = wonWithDays.length > 0
    ? Math.round(wonWithDays.reduce((sum, l) => sum + (l.giorni_pipeline ?? 0), 0) / wonWithDays.length)
    : 0

  const overdue = openLeads.filter(
    l => l.giorni_ultimo_contatto !== null && l.giorni_ultimo_contatto >= settings.followup_threshold_days
  )

  const today = new Date().toISOString().split('T')[0]
  const todayFollowups = openLeads.filter(l => l.ricontattare === today)

  const leadsByStage = settings.pipeline_stages.map(stage => {
    const stageLeads = allLeads.filter(l => l.stadio_pipeline === stage)
    const revenue = stageLeads.reduce((sum, l) => sum + (l.valore ?? 0), 0)
    return { stage, count: stageLeads.length, revenue }
  })

  const leadsByOrigine: Record<string, number> = {}
  for (const lead of allLeads) {
    if (lead.origine) leadsByOrigine[lead.origine] = (leadsByOrigine[lead.origine] ?? 0) + 1
  }

  const conversionePerOrigine = Object.entries(leadsByOrigine).map(([origine, totale]) => {
    const vinti = wonLeads.filter(l => l.origine === origine).length
    return { origine, totale, vinti, tasso: Math.round((vinti / totale) * 100) }
  }).sort((a, b) => b.tasso - a.tasso)

  const trendMensile: Record<string, number> = {}
  for (const lead of allLeads) {
    if (lead.data_apertura) {
      const month = lead.data_apertura.slice(0, 7) // YYYY-MM
      trendMensile[month] = (trendMensile[month] ?? 0) + 1
    }
  }
  const trendMensileRows = Object.entries(trendMensile)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)

  let cumul = 0
  const trendChartData = trendMensileRows.map(([month, count]) => {
    cumul += count
    const [year, m] = month.split('-')
    const label = new Date(Number(year), Number(m) - 1).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
    return { label, count, cumulativo: cumul }
  })

  const conversionChartData = conversionePerOrigine.map(({ origine, totale, vinti }) => ({
    origine,
    tassoVinti: Math.round((vinti / totale) * 100),
    tassoNonVinti: Math.round(((totale - vinti) / totale) * 100),
    tasso: Math.round((vinti / totale) * 100),
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard title="Lead totali" value={allLeads.length} subtitle={`${openLeads.length} aperti`} icon={Users} color="blue" />
        <StatsCard title="Tasso conversione" value={`${conversionRate}%`} subtitle={`${wonLeads.length} vinti su ${allLeads.length}`} icon={TrendingUp} color="green" />
        <StatsCard title="Giorni medi chiusura" value={avgDaysToClose} icon={Clock} color="amber" />
        <StatsCard title="Scaduti follow-up" value={overdue.length} subtitle={`soglia: ${settings.followup_threshold_days}gg`} icon={AlertCircle} color="red" />
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="font-semibold mb-4">Trend mensile lead</h2>
        <TrendChart data={trendChartData} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Pipeline per stadio</h2>
          <PipelineChart data={leadsByStage} />
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Conversione per origine</h2>
          <ConversionChart data={conversionChartData} />
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
