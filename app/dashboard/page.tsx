export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { StatsCard } from '@/components/ui/StatsCard'
import { computeLeadFields, CLOSED_STAGES } from '@/types'
import Link from 'next/link'
import { Users, TrendingUp, Clock, AlertCircle, Euro, Trophy, Target } from 'lucide-react'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { PipelineChart } from '@/components/dashboard/PipelineChart'
import { ConversionChart } from '@/components/dashboard/ConversionChart'
import { ChartsSection } from '@/components/dashboard/ChartsSection'
import type { SlimLead } from '@/components/dashboard/ChartsSection'
import { DashboardFilters } from '@/components/dashboard/DashboardFilters'
import { Suspense } from 'react'

function getDateRange(range: string | null, from: string | null, to: string | null): { start: Date | null; end: Date | null } {
  if (from || to) {
    return {
      start: from ? new Date(from) : null,
      end: to ? new Date(to + 'T23:59:59') : null,
    }
  }
  const days = parseInt(range ?? '30', 10)
  if (isNaN(days)) return { start: null, end: null }
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return { start, end }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; owner?: string; stadio?: string; origine?: string }>
}) {
  const sp = await searchParams
  const { start, end } = getDateRange(sp.range ?? null, sp.from ?? null, sp.to ?? null)
  const filterOwner = sp.owner ?? null
  const filterStadio = sp.stadio ?? null
  const filterOrigine = sp.origine ?? null

  const supabase = createServiceClient()
  const [{ data: leads }, settings] = await Promise.all([
    supabase.from('leads').select('*'),
    getSettings(),
  ])

  const allLeadsRaw = (leads ?? []).map(l => computeLeadFields(l))

  const baseLeads = allLeadsRaw.filter(l =>
    (!filterOwner || l.owner === filterOwner) &&
    (!filterStadio || l.stadio_pipeline === filterStadio) &&
    (!filterOrigine || l.origine === filterOrigine)
  )

  const filterByDate = (l: (typeof allLeadsRaw)[0], dateField: string | null) => {
    if (!start && !end) return true
    if (!dateField) return false
    const d = new Date(dateField)
    if (start && d < start) return false
    if (end && d > end) return false
    return true
  }

  const allLeads = baseLeads.filter(l => filterByDate(l, l.data_apertura))
  // openLeads uses baseLeads (owner/stadio/origine filtered) but ignores date
  const openLeads = baseLeads.filter(l => !CLOSED_STAGES.includes(l.stadio_pipeline))
  // Won leads filtered by close date, not open date
  const wonLeads = baseLeads.filter(l =>
    l.stadio_pipeline === 'Chiuso (Vinto)' && filterByDate(l, l.data_chiusura)
  )

  const conversionRate = allLeads.length > 0
    ? Math.round((wonLeads.length / allLeads.length) * 100)
    : 0

  const wonWithDays = wonLeads.filter(l => l.giorni_pipeline !== null)
  const avgDaysToClose = wonWithDays.length > 0
    ? Math.round(wonWithDays.reduce((sum, l) => sum + (l.giorni_pipeline ?? 0), 0) / wonWithDays.length)
    : 0

  const totalRevenue = wonLeads.reduce((sum, l) => sum + (l.valore ?? 0), 0)
  const pipelineValue = openLeads.reduce((sum, l) => sum + (l.valore ?? 0), 0)

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

  // Trend uses filtered leads
  const trendMensile: Record<string, number> = {}
  for (const lead of allLeads) {
    if (lead.data_apertura) {
      const month = lead.data_apertura.slice(0, 7)
      trendMensile[month] = (trendMensile[month] ?? 0) + 1
    }
  }
  const trendMensileRows = Object.entries(trendMensile).sort(([a], [b]) => a.localeCompare(b))
  const counts = trendMensileRows.map(([, count]) => count)
  const trendChartData = trendMensileRows.map(([month, count], i) => {
    const w = counts.slice(Math.max(0, i - 2), i + 1)
    const media = Math.round(w.reduce((a, b) => a + b, 0) / w.length)
    const [year, m] = month.split('-')
    const label = new Date(Number(year), Number(m) - 1).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
    return { label, count, media, month }
  })

  const conversionChartData = conversionePerOrigine.map(({ origine, totale, vinti }) => ({
    origine,
    tassoVinti: Math.round((vinti / totale) * 100),
    tassoNonVinti: Math.round(((totale - vinti) / totale) * 100),
    tasso: Math.round((vinti / totale) * 100),
  }))

  // Sito chart data
  const sitoChartData = [
    { name: 'Sì', value: allLeads.filter(l => l.hanno_sito === true).length },
    { name: 'No', value: allLeads.filter(l => l.hanno_sito === false).length },
    { name: 'N/D', value: allLeads.filter(l => l.hanno_sito === null).length },
  ].filter(d => d.value > 0)

  // Dipendenti chart data — count by predefined range string
  const dipendentiOrder = ['1-10','11-50','51-200','201-500','501-1000','1001-5000','5001-10000','10000+','Studente','Autonomo']
  const dipendentiMap: Record<string, number> = {}
  for (const lead of baseLeads) {
    const key = lead.dipendenti ?? 'N/D'
    dipendentiMap[key] = (dipendentiMap[key] ?? 0) + 1
  }
  const dipendentiChartData = [
    ...dipendentiOrder.filter(r => dipendentiMap[r]).map(r => ({ range: r, count: dipendentiMap[r] })),
    ...(dipendentiMap['N/D'] ? [{ range: 'N/D', count: dipendentiMap['N/D'] }] : []),
  ]

  // Industry chart data
  const industryMap: Record<string, number> = {}
  for (const lead of baseLeads) {
    const key = lead.industry ?? 'N/D'
    industryMap[key] = (industryMap[key] ?? 0) + 1
  }
  const industryChartData = Object.entries(industryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Filter options — always from full dataset so options don't disappear when filtering
  const availableOwners = [...new Set(allLeadsRaw.map(l => l.owner).filter(Boolean))].sort() as string[]
  const availableStages = [...new Set(allLeadsRaw.map(l => l.stadio_pipeline).filter(Boolean))].sort() as string[]
  const availableOrigini = [...new Set(allLeadsRaw.map(l => l.origine).filter(Boolean))].sort() as string[]

  // Owner chart data
  const ownerMap: Record<string, number> = {}
  for (const lead of baseLeads) {
    const key = lead.owner ?? 'N/D'
    ownerMap[key] = (ownerMap[key] ?? 0) + 1
  }
  const ownerChartData = Object.entries(ownerMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const slimLeads: SlimLead[] = allLeadsRaw.map(l => ({
    id: l.id,
    nome: l.nome,
    cognome: l.cognome,
    azienda: l.azienda,
    stadio_pipeline: l.stadio_pipeline,
    valore: l.valore,
    industry: l.industry,
    dipendenti: l.dipendenti,
    origine: l.origine,
    data_apertura: l.data_apertura,
    owner: l.owner,
  }))

  const wonDealsSorted = wonLeads
    .filter(l => l.data_chiusura)
    .sort((a, b) => (b.data_chiusura ?? '').localeCompare(a.data_chiusura ?? ''))

  const openDealsSorted = openLeads
    .filter(l => l.valore)
    .sort((a, b) => (b.valore ?? 0) - (a.valore ?? 0))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Suspense>
          <DashboardFilters
            owners={availableOwners}
            stages={availableStages}
            origini={availableOrigini}
          />
        </Suspense>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatsCard title="Lead totali" value={allLeads.length} subtitle={`${openLeads.length} aperti`} icon={Users} color="blue" />
        <StatsCard title="Tasso conversione" value={`${conversionRate}%`} subtitle={`${wonLeads.length} vinti su ${allLeads.length}`} icon={TrendingUp} color="green" />
        <StatsCard title="Fatturato vinti" value={`€${totalRevenue.toLocaleString('it-IT')}`} subtitle={`${wonLeads.length} deal chiusi`} icon={Euro} color="green" />
        <StatsCard title="Pipeline aperta" value={`€${pipelineValue.toLocaleString('it-IT')}`} subtitle={`${openLeads.filter(l => l.valore).length} deal con valore`} icon={Target} color="blue" />
        <StatsCard title="Giorni medi chiusura" value={avgDaysToClose} icon={Clock} color="amber" />
        <StatsCard title="Scaduti follow-up" value={overdue.length} subtitle={`soglia: ${settings.followup_threshold_days}gg`} icon={AlertCircle} color="red" />
      </div>

      <ChartsSection
        sitoChartData={sitoChartData}
        dipendentiChartData={dipendentiChartData}
        industryChartData={industryChartData}
        trendChartData={trendChartData}
        pipelineData={leadsByStage}
        conversionChartData={conversionChartData}
        ownerChartData={ownerChartData}
        leads={slimLeads}
      />

      {wonDealsSorted.length > 0 && (
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4 text-green-600" />
            <h2 className="font-semibold">Deal chiusi vinti ({wonDealsSorted.length})</h2>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Cliente</th>
                  <th className="pb-2 font-medium text-muted-foreground">Azienda</th>
                  <th className="pb-2 font-medium text-muted-foreground">Origine</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Valore</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Chiuso il</th>
                </tr>
              </thead>
              <tbody>
                {wonDealsSorted.map(lead => (
                  <tr key={lead.id} className="border-b last:border-0">
                    <td className="py-2">
                      <Link href={`/leads/${lead.id}`} className="hover:underline font-medium">
                        {lead.nome} {lead.cognome}
                      </Link>
                    </td>
                    <td className="py-2 text-muted-foreground">{lead.azienda ?? '—'}</td>
                    <td className="py-2 text-muted-foreground">{lead.origine ?? '—'}</td>
                    <td className="py-2 text-right font-medium text-green-700">
                      {lead.valore != null ? `€${lead.valore.toLocaleString('it-IT')}` : '—'}
                    </td>
                    <td className="py-2 text-right text-muted-foreground">
                      {lead.data_chiusura ? new Date(lead.data_chiusura).toLocaleDateString('it-IT') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {openDealsSorted.length > 0 && (
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-blue-600" />
            <h2 className="font-semibold">Deal aperti con valore ({openDealsSorted.length})</h2>
            <span className="ml-auto text-sm font-medium text-blue-700">€{pipelineValue.toLocaleString('it-IT')}</span>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Cliente</th>
                  <th className="pb-2 font-medium text-muted-foreground">Azienda</th>
                  <th className="pb-2 font-medium text-muted-foreground">Stadio</th>
                  <th className="pb-2 font-medium text-muted-foreground">Origine</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Valore</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Aperto da</th>
                </tr>
              </thead>
              <tbody>
                {openDealsSorted.map(lead => (
                  <tr key={lead.id} className="border-b last:border-0">
                    <td className="py-2">
                      <Link href={`/leads/${lead.id}`} className="hover:underline font-medium">
                        {lead.nome} {lead.cognome}
                      </Link>
                    </td>
                    <td className="py-2 text-muted-foreground">{lead.azienda ?? '—'}</td>
                    <td className="py-2 text-muted-foreground">{lead.stadio_pipeline}</td>
                    <td className="py-2 text-muted-foreground">{lead.origine ?? '—'}</td>
                    <td className="py-2 text-right font-medium text-blue-700">
                      {lead.valore != null ? `€${lead.valore.toLocaleString('it-IT')}` : '—'}
                    </td>
                    <td className="py-2 text-right text-muted-foreground">
                      {lead.giorni_aperto != null ? `${lead.giorni_aperto}gg` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {overdue.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <h2 className="font-semibold text-orange-800 mb-3">Da ricontattare ({overdue.length})</h2>
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
