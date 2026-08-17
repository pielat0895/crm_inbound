export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields, STATO_TERMINALI, STATO_APPUNTAMENTO_OPTIONS } from '@/types'
import Link from 'next/link'
import { Suspense } from 'react'
import { percent, winRateVintoPerso, weightedForecast, performanceByKey, distribuzioneEsiti, schedulingToCloseRate } from '@/lib/dashboard-metrics'
import { leadARischio } from '@/lib/tasks'
import { PreviewShell } from '@/components/preview/PreviewShell'
import { StatGrid } from '@/components/dashboard-preview/StatGrid'
import { StatTile } from '@/components/dashboard-preview/StatTile'
import { SectionCard, Accent } from '@/components/dashboard-preview/SectionCard'
import { PreviewChartsClient } from '@/components/dashboard-preview/PreviewChartsClient'
import { DashboardFiltersPreview } from '@/components/dashboard-preview/DashboardFiltersPreview'
import { PLUM, GRAY_BORDER, ORANGE, GRAY_500 } from '@/components/dashboard-preview/tokens'
import { stageBadgeColors } from '@/components/preview/badge-colors'

function getDateRange(range: string | null, from: string | null, to: string | null): { start: Date | null; end: Date | null } {
  if (from || to) {
    return {
      start: from ? new Date(from) : null,
      end: to ? new Date(to + 'T23:59:59') : null,
    }
  }
  if (range === 'all') return { start: null, end: null }
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

  const now = new Date()
  const allLeadsRaw = (leads ?? []).map(l => computeLeadFields(l, now))

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

  const nonPresentati = allLeads.filter(l => l.stato_appuntamento === 'Non presentato').length
  const effettuati = allLeads.filter(l => l.stato_appuntamento === 'Effettuato').length
  const noShowRate = percent(nonPresentati, nonPresentati + effettuati)

  const appuntamentoChartData = STATO_APPUNTAMENTO_OPTIONS.map(stato => ({
    stato,
    count: allLeads.filter(l => l.stato_appuntamento === stato).length,
  }))

  const { vinti: schedVinti, totale: schedTotale, rate: schedulingToCloseRateValue } = schedulingToCloseRate(closedDecisive)
  const esitiChartData = distribuzioneEsiti(closedInRange, STATO_TERMINALI)
  const rischio = leadARischio(openLeads, now, settings.followup_threshold_days)
  const today = now.toISOString().split('T')[0]
  const todayFollowups = openLeads.filter(l => l.ricontattare === today)

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

  const availableOwners = [...new Set(allLeadsRaw.map(l => l.owner).filter(Boolean))].sort() as string[]
  const availableStages = [...new Set(allLeadsRaw.map(l => l.stadio_pipeline).filter(Boolean))].sort() as string[]
  const availableOrigini = [...new Set(allLeadsRaw.map(l => l.origine).filter(Boolean))].sort() as string[]

  const slimLeads = baseLeads.map(l => ({
    id: l.id, nome: l.nome, cognome: l.cognome, azienda: l.azienda,
    stadio_pipeline: l.stadio_pipeline, stato: l.stato, stato_appuntamento: l.stato_appuntamento,
    valore: l.valore, industry: l.industry, dipendenti: l.dipendenti, origine: l.origine,
    owner: l.owner, data_apertura: l.data_apertura,
  }))

  const wonDealsSorted = wonLeads.filter(l => l.data_chiusura).sort((a, b) => (b.data_chiusura ?? '').localeCompare(a.data_chiusura ?? ''))
  const openDealsSorted = openLeads.filter(l => l.valore).sort((a, b) => (b.valore ?? 0) - (a.valore ?? 0))

  const headerStats = [
    { value: String(allLeadsRaw.length), label: 'LEAD TOTALI' },
    { value: `${winRate}%`, label: 'WIN RATE', color: ORANGE },
    { value: `€${pipelineValue.toLocaleString('it-IT')}`, label: 'PIPELINE APERTA', color: ORANGE },
  ]
  const footerNote = `${allLeadsRaw.length} lead · ${rischio.length} follow-up scaduti`

  const th: React.CSSProperties = { padding: '0 0 9px', textAlign: 'left', font: "700 10px/1 'Open Sans'", letterSpacing: '.1em', color: GRAY_500 }

  return (
    <PreviewShell
      pageLabel="STATO DEL PORTAFOGLIO"
      titleAccent="STATO"
      titleRest="DEL PORTAFOGLIO"
      headerStats={headerStats}
      footerNote={footerNote}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Suspense>
          <DashboardFiltersPreview owners={availableOwners} stages={availableStages} origini={availableOrigini} />
        </Suspense>

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

        {openDealsSorted.length > 0 && (
          <div style={{ background: '#fff', border: `1px solid ${GRAY_BORDER}`, padding: '22px 24px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
              <h2 style={{ fontFamily: "'Brygada 1918', Georgia, serif", fontWeight: 700, fontSize: 15, letterSpacing: '.07em', textTransform: 'uppercase', margin: 0 }}>
                Deal aperti con <span style={{ color: ORANGE }}>valore</span>
              </h2>
              <span style={{ marginLeft: 'auto', font: "700 18px/1 'Open Sans'", color: ORANGE }}>€{pipelineValue.toLocaleString('it-IT')}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${PLUM}` }}>
                    <th style={th}>CLIENTE</th>
                    <th style={th}>AZIENDA</th>
                    <th style={th}>STADIO</th>
                    <th style={th}>ORIGINE</th>
                    <th style={{ ...th, textAlign: 'right' }}>VALORE</th>
                    <th style={{ ...th, textAlign: 'right' }}>APERTO DA</th>
                  </tr>
                </thead>
                <tbody>
                  {openDealsSorted.map(lead => {
                    const badge = stageBadgeColors(lead.stadio_pipeline)
                    return (
                      <tr key={lead.id} style={{ borderBottom: `1px solid ${GRAY_BORDER}` }}>
                        <td style={{ padding: '11px 0' }}>
                          <Link href={`/leads/${lead.id}`} style={{ color: PLUM, textDecoration: 'none', fontWeight: 600 }}>{lead.nome} {lead.cognome}</Link>
                        </td>
                        <td style={{ padding: '11px 0', color: GRAY_500 }}>{lead.azienda ?? '—'}</td>
                        <td style={{ padding: '11px 0' }}>
                          <span style={{ display: 'inline-block', padding: '3px 8px', font: "700 9px/1.3 'Open Sans'", letterSpacing: '.1em', background: badge.bg, color: badge.fg }}>
                            {lead.stadio_pipeline.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '11px 0', color: GRAY_500 }}>{lead.origine ?? '—'}</td>
                        <td style={{ padding: '11px 0', textAlign: 'right', fontWeight: 700 }}>
                          {lead.valore != null ? `€${lead.valore.toLocaleString('it-IT')}` : '—'}
                        </td>
                        <td style={{ padding: '11px 0', textAlign: 'right', color: GRAY_500 }}>
                          {lead.giorni_aperto != null ? `${lead.giorni_aperto} gg` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {wonDealsSorted.length > 0 && (
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
                        <Link href={`/leads/${lead.id}`} style={{ color: ORANGE, textDecoration: 'none', fontWeight: 600 }}>{lead.nome} {lead.cognome}</Link>
                      </td>
                      <td style={{ padding: '8px 0', color: '#5E525A' }}>{lead.azienda ?? '—'}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700 }}>{lead.valore != null ? `€${lead.valore.toLocaleString('it-IT')}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 24 }}>
          <div style={{ background: PLUM, padding: '22px 24px' }}>
            <p style={{ margin: '0 0 16px', font: "700 11px/1 'Open Sans'", letterSpacing: '.12em', color: ORANGE }}>LEAD A RISCHIO</p>
            {rischio.length === 0 ? (
              <p style={{ margin: 0, font: "400 13px/1.4 'Open Sans'", color: 'rgba(255,255,255,.6)' }}>Nessun lead fermo oltre la soglia.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {rischio.slice(0, 10).map(({ lead, giorni, maiContattato }) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,.14)', textDecoration: 'none' }}
                  >
                    <span style={{ font: "400 13px/1.3 'Open Sans'", color: '#fff' }}>{lead.nome} {lead.cognome} · {lead.azienda}</span>
                    <span style={{ font: "700 12px/1.3 'Open Sans'", letterSpacing: '.06em', color: ORANGE, flex: 'none' }}>
                      {maiContattato ? `MAI CONTATTATO` : `${giorni} GG`}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div style={{ background: '#fff', border: `1px solid ${GRAY_BORDER}`, padding: '22px 24px' }}>
            <p style={{ margin: '0 0 16px', font: "700 11px/1 'Open Sans'", letterSpacing: '.12em' }}>FOLLOW-UP DI OGGI</p>
            {todayFollowups.length === 0 ? (
              <p style={{ margin: 0, font: "400 13px/1.4 'Open Sans'", color: GRAY_500 }}>Nessun follow-up in programma per oggi.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {todayFollowups.map(lead => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    style={{ display: 'block', padding: '11px 0', borderBottom: `1px solid ${GRAY_BORDER}`, font: "400 13px/1.3 'Open Sans'", color: PLUM, textDecoration: 'none' }}
                  >
                    {lead.nome} {lead.cognome} · {lead.azienda}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PreviewShell>
  )
}
