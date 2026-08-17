export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields, STATO_TERMINALI, STATO_APPUNTAMENTO_OPTIONS } from '@/types'
import Link from 'next/link'
import { percent, winRateVintoPerso, weightedForecast, performanceByKey, distribuzioneEsiti, schedulingToCloseRate } from '@/lib/dashboard-metrics'
import { leadARischio } from '@/lib/tasks'
import { PreviewShell } from '@/components/preview/PreviewShell'
import { StatGrid } from '@/components/dashboard-preview/StatGrid'
import { StatTile } from '@/components/dashboard-preview/StatTile'
import { SectionCard, Accent } from '@/components/dashboard-preview/SectionCard'
import { PreviewChartsClient } from '@/components/dashboard-preview/PreviewChartsClient'
import { GRAY_BORDER, ORANGE, GRAY_500 } from '@/components/dashboard-preview/tokens'

// Duplicato deliberato di app/dashboard/page.tsx: stessa pipeline dati/KPI
// (già testata), solo la presentazione cambia. Zero rischio per la
// dashboard di produzione — vedi docs/superpowers/specs per il perché
// di questa convenzione nel repo (duplicare invece di astrarre i grafici).
export default async function DashboardPreviewPage() {
  const supabase = createServiceClient()
  const [{ data: leads }, settings] = await Promise.all([
    supabase.from('leads').select('*'),
    getSettings(),
  ])

  const allLeadsRaw = (leads ?? []).map(l => computeLeadFields(l))
  const baseLeads = allLeadsRaw

  const start: Date | null = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d })()
  const end: Date | null = new Date()
  const filterByDate = (l: (typeof allLeadsRaw)[0], dateField: string | null) => {
    if (!dateField) return false
    const d = new Date(dateField)
    return d >= start && d <= end
  }

  const allLeads = baseLeads.filter(l => filterByDate(l, l.data_apertura))
  const openLeads = baseLeads.filter(l => !STATO_TERMINALI.includes(l.stato ?? ''))
  const closedInRange = baseLeads.filter(l => filterByDate(l, l.data_chiusura))
  const closedDecisive = closedInRange.filter(l => l.stato === 'Vinto' || l.stato === 'Perso')
  const wonLeads = closedInRange.filter(l => l.stato === 'Vinto')

  const leadWonToday = allLeads.filter(l => l.stato === 'Vinto').length
  const conversioneLeadRate = percent(leadWonToday, allLeads.length)
  const { vinti: winVinti, rate: winRate } = winRateVintoPerso(closedDecisive)

  const wonWithDays = wonLeads.filter(l => l.giorni_pipeline !== null)
  const avgDaysToClose = wonWithDays.length > 0
    ? Math.round(wonWithDays.reduce((sum, l) => sum + (l.giorni_pipeline ?? 0), 0) / wonWithDays.length)
    : 0

  const totalRevenue = wonLeads.reduce((sum, l) => sum + (l.valore ?? 0), 0)
  const pipelineValue = openLeads.reduce((sum, l) => sum + (l.valore ?? 0), 0)
  const forecastPesato = weightedForecast(openLeads, settings.pipeline_stage_probabilities)

  const nonPresentati = baseLeads.filter(l => l.stato_appuntamento === 'Non presentato').length
  const effettuati = baseLeads.filter(l => l.stato_appuntamento === 'Effettuato').length
  const noShowRate = percent(nonPresentati, nonPresentati + effettuati)

  const appuntamentoChartData = STATO_APPUNTAMENTO_OPTIONS.map(stato => ({
    stato,
    count: baseLeads.filter(l => l.stato_appuntamento === stato).length,
  }))

  const { vinti: schedVinti, totale: schedTotale, rate: schedulingToCloseRateValue } = schedulingToCloseRate(closedDecisive)
  const esitiChartData = distribuzioneEsiti(closedInRange, STATO_TERMINALI)
  const rischio = leadARischio(openLeads, new Date(), settings.followup_threshold_days)

  const leadsByStage = settings.pipeline_stages.map(stage => {
    const stageLeads = allLeads.filter(l => l.stadio_pipeline === stage)
    return { stage, count: stageLeads.length }
  })

  const trendMensile: Record<string, number> = {}
  for (const lead of allLeads) {
    if (lead.data_apertura) {
      const month = lead.data_apertura.slice(0, 7)
      trendMensile[month] = (trendMensile[month] ?? 0) + 1
    }
  }
  const trendChartData = Object.entries(trendMensile)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => {
      const [year, m] = month.split('-')
      const label = new Date(Number(year), Number(m) - 1).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
      return { label, value: count, month }
    })

  const conversionePerOrigine = performanceByKey(allLeads.filter(l => l.origine), l => l.origine).sort((a, b) => b.tasso - a.tasso)
  const conversionChartData = conversionePerOrigine.map(({ key, tasso }) => ({ origine: key, tassoVinti: tasso, tassoNonVinti: 100 - tasso }))

  const performancePerOwner = performanceByKey(allLeads, l => l.owner).sort((a, b) => b.tasso - a.tasso)
  const ownerConversionChartData = performancePerOwner.map(({ key, tasso }) => ({ owner: key, tassoVinti: tasso, tassoNonVinti: 100 - tasso }))

  const sitoChartData = [
    { name: 'Sì', value: allLeads.filter(l => l.hanno_sito === true).length },
    { name: 'No', value: allLeads.filter(l => l.hanno_sito === false).length },
    { name: 'N/D', value: allLeads.filter(l => l.hanno_sito === null).length },
  ].filter(d => d.value > 0)

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

  const industryMap: Record<string, number> = {}
  for (const lead of baseLeads) {
    const key = lead.industry ?? 'N/D'
    industryMap[key] = (industryMap[key] ?? 0) + 1
  }
  const industryChartData = Object.entries(industryMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  const ownerMap: Record<string, number> = {}
  for (const lead of baseLeads) {
    const key = lead.owner ?? 'N/D'
    ownerMap[key] = (ownerMap[key] ?? 0) + 1
  }
  const ownerChartData = Object.entries(ownerMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  const slimLeads = allLeadsRaw.map(l => ({
    id: l.id, nome: l.nome, cognome: l.cognome, azienda: l.azienda,
    stadio_pipeline: l.stadio_pipeline, stato: l.stato, stato_appuntamento: l.stato_appuntamento,
    valore: l.valore, industry: l.industry, dipendenti: l.dipendenti, origine: l.origine,
    owner: l.owner, data_apertura: l.data_apertura,
  }))

  const wonDealsSorted = wonLeads.filter(l => l.data_chiusura).sort((a, b) => (b.data_chiusura ?? '').localeCompare(a.data_chiusura ?? ''))

  const headerStats = [
    { value: String(allLeadsRaw.length), label: 'LEAD TOTALI' },
    { value: `${winRate}%`, label: 'WIN RATE', color: ORANGE },
    { value: `€${pipelineValue.toLocaleString('it-IT')}`, label: 'PIPELINE APERTA', color: ORANGE },
  ]
  const footerNote = `${allLeadsRaw.length} lead · ${rischio.length} follow-up scaduti`

  return (
    <PreviewShell
      pageLabel="ULTIMI 30 GIORNI"
      titleAccent="STATO"
      titleRest="DEL PORTAFOGLIO"
      headerStats={headerStats}
      footerNote={footerNote}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Link href="/dashboard" style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: GRAY_500, textDecoration: 'none' }}>
          ← Torna alla dashboard attuale
        </Link>
      </div>

      <StatGrid columns={5}>
        <StatTile label="Lead totali" value={allLeads.length} sub={`${openLeads.length} aperti`} />
        <StatTile label="Conversione lead" value={`${conversioneLeadRate}%`} sub={`${leadWonToday} vinti su ${allLeads.length}`} accent={ORANGE} />
        <StatTile label="Win rate" value={`${winRate}%`} sub={`${winVinti} vinti su ${closedDecisive.length} chiusi`} accent={ORANGE} />
        <StatTile label="Fatturato vinti" value={`€${totalRevenue.toLocaleString('it-IT')}`} sub={`${wonLeads.length} deal chiusi`} />
        <StatTile label="Pipeline aperta" value={`€${pipelineValue.toLocaleString('it-IT')}`} sub={`${openLeads.filter(l => l.valore).length} deal`} dark />
        <StatTile label="Forecast pesato" value={`€${Math.round(forecastPesato).toLocaleString('it-IT')}`} sub="pipeline × probabilità" accent={ORANGE} />
        <StatTile label="Giorni medi chiusura" value={avgDaysToClose} />
        <StatTile label="Lead a rischio" value={rischio.length} sub={`fermi da ${settings.followup_threshold_days}+ gg`} accent={ORANGE} />
        <StatTile label="Tasso no-show" value={`${noShowRate}%`} sub={`${nonPresentati} su ${nonPresentati + effettuati}`} accent={ORANGE} />
        <StatTile label="Scheduling→chiusura" value={`${schedulingToCloseRateValue}%`} sub={`${schedVinti} su ${schedTotale} effettuati`} accent={ORANGE} />
      </StatGrid>

      <PreviewChartsClient
        trendChartData={trendChartData}
        pipelineData={leadsByStage}
        conversionChartData={conversionChartData}
        ownerConversionChartData={ownerConversionChartData}
        ownerChartData={ownerChartData}
        appuntamentoChartData={appuntamentoChartData}
        esitiChartData={esitiChartData}
        sitoChartData={sitoChartData}
        dipendentiChartData={dipendentiChartData}
        industryChartData={industryChartData}
        leads={slimLeads}
      />

      {wonDealsSorted.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <SectionCard title={<>Deal chiusi <Accent>vinti</Accent></>}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${GRAY_BORDER}`, textAlign: 'left' }}>
                    <th style={{ padding: '0 0 8px', fontWeight: 700, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: GRAY_500 }}>Cliente</th>
                    <th style={{ padding: '0 0 8px', fontWeight: 700, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: GRAY_500 }}>Azienda</th>
                    <th style={{ padding: '0 0 8px', fontWeight: 700, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: GRAY_500, textAlign: 'right' }}>Valore</th>
                  </tr>
                </thead>
                <tbody>
                  {wonDealsSorted.map(lead => (
                    <tr key={lead.id} style={{ borderBottom: '1px solid #EEEEEE' }}>
                      <td style={{ padding: '8px 0' }}>
                        <Link href={`/leads-preview/${lead.id}`} style={{ color: ORANGE, textDecoration: 'none', fontWeight: 600 }}>{lead.nome} {lead.cognome}</Link>
                      </td>
                      <td style={{ padding: '8px 0', color: '#5E525A' }}>{lead.azienda ?? '—'}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700 }}>{lead.valore != null ? `€${lead.valore.toLocaleString('it-IT')}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}
    </PreviewShell>
  )
}
