'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { SectionCard, Accent } from './SectionCard'
import { PreviewBarChart } from './PreviewBarChart'
import { PreviewFunnelBars } from './PreviewFunnelBars'
import { PreviewStackedBarChart } from './PreviewStackedBarChart'
import { PreviewHorizontalBarChart } from './PreviewHorizontalBarChart'
import { PreviewStatList } from './PreviewStatList'
import {
  STAGE_COLORS_FUNNEL, STATO_APPUNTAMENTO_PREVIEW_COLORS, STATO_TERMINALI_PREVIEW_COLORS,
  GRAY_BORDER, ORANGE, PLUM, TEAL,
} from './tokens'

export type PreviewSlimLead = {
  id: string
  nome: string | null
  cognome: string | null
  azienda: string | null
  stadio_pipeline: string
  stato: string | null
  stato_appuntamento: string
  valore: number | null
  industry: string | null
  dipendenti: string | null
  origine: string | null
  owner: string | null
  data_apertura: string | null
}

type Props = {
  trendChartData: { label: string; value: number; month: string }[]
  pipelineData: { stage: string; count: number }[]
  conversionChartData: { origine: string; tassoVinti: number; tassoNonVinti: number }[]
  ownerConversionChartData: { owner: string; tassoVinti: number; tassoNonVinti: number }[]
  ownerChartData: { name: string; value: number }[]
  appuntamentoChartData: { stato: string; count: number }[]
  esitiChartData: { stato: string; count: number }[]
  sitoChartData: { name: string; value: number }[]
  dipendentiChartData: { range: string; count: number }[]
  industryChartData: { name: string; value: number }[]
  leads: PreviewSlimLead[]
}

type ModalState = { open: boolean; title: string; leads: PreviewSlimLead[] }

export function PreviewChartsClient({
  trendChartData, pipelineData, conversionChartData, ownerConversionChartData,
  ownerChartData, appuntamentoChartData, esitiChartData, sitoChartData,
  dipendentiChartData, industryChartData, leads,
}: Props) {
  const [modal, setModal] = useState<ModalState>({ open: false, title: '', leads: [] })

  function open(title: string, filtered: PreviewSlimLead[]) {
    setModal({ open: true, title, leads: filtered })
  }

  const byStadio = (label: string) => open(`Stadio: ${label}`, leads.filter(l => l.stadio_pipeline === label))
  const byStato = (label: string) => open(`Esito: ${label}`, leads.filter(l => l.stato === label))
  const byOrigine = (label: string) => open(`Origine: ${label}`, leads.filter(l => label === 'N/D' ? !l.origine : l.origine === label))
  const byOwner = (label: string) => open(`Owner: ${label}`, leads.filter(l => label === 'N/D' ? !l.owner : l.owner === label))
  const byAppuntamento = (label: string) => open(`Stato appuntamento: ${label}`, leads.filter(l => l.stato_appuntamento === label))
  const byDipendenti = (label: string) => open(`Dimensione azienda: ${label}`, leads.filter(l => label === 'N/D' ? !l.dipendenti : l.dipendenti === label))
  const byIndustry = (label: string) => open(`Industry: ${label}`, leads.filter(l => label === 'N/D' ? !l.industry : l.industry === label))
  const byTrend = (label: string) => {
    const month = trendChartData.find(t => t.label === label)?.month
    open(`Lead aperti: ${label}`, leads.filter(l => l.data_apertura?.slice(0, 7) === month))
  }

  return (
    <>
      <SectionCard title={<>Trend <Accent>mensile lead</Accent></>}>
        <PreviewBarChart data={trendChartData} highlightLast onSegmentClick={byTrend} />
      </SectionCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 1, background: GRAY_BORDER, border: `1px solid ${GRAY_BORDER}`, marginTop: 20 }}>
        <div style={{ background: '#fff', padding: '22px 24px 18px' }}>
          <h2 style={{ fontFamily: "'Brygada 1918', Georgia, serif", fontWeight: 700, fontSize: 15, letterSpacing: '.07em', textTransform: 'uppercase', margin: '0 0 20px' }}>
            Imbuto <Accent>pipeline</Accent>
          </h2>
          <PreviewFunnelBars
            data={pipelineData.map(p => ({ label: p.stage, count: p.count, color: STAGE_COLORS_FUNNEL[p.stage] ?? PLUM }))}
            onSegmentClick={byStadio}
          />
        </div>
        <div style={{ background: '#fff', padding: '22px 24px 18px' }}>
          <h2 style={{ fontFamily: "'Brygada 1918', Georgia, serif", fontWeight: 700, fontSize: 15, letterSpacing: '.07em', textTransform: 'uppercase', margin: '0 0 20px' }}>
            Conversione <Accent>per origine</Accent>
          </h2>
          <PreviewStackedBarChart data={conversionChartData.map(c => ({ label: c.origine, ...c }))} onSegmentClick={byOrigine} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        <SectionCard title={<>Performance <Accent>owner</Accent></>}>
          <PreviewStackedBarChart data={ownerConversionChartData.map(o => ({ label: o.owner, ...o }))} onSegmentClick={byOwner} />
        </SectionCard>
        <SectionCard title={<>Distribuzione <Accent>esiti</Accent></>}>
          <PreviewHorizontalBarChart
            data={esitiChartData.map(e => ({ label: e.stato, count: e.count }))}
            colors={STATO_TERMINALI_PREVIEW_COLORS}
            onSegmentClick={byStato}
          />
        </SectionCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        <SectionCard title={<>Lead <Accent>per owner</Accent></>}>
          <PreviewBarChart data={ownerChartData.map(o => ({ label: o.name, value: o.value }))} onSegmentClick={byOwner} />
        </SectionCard>
        <SectionCard title={<>Stato <Accent>appuntamento</Accent></>}>
          <PreviewHorizontalBarChart
            data={appuntamentoChartData.map(a => ({ label: a.stato, count: a.count }))}
            colors={STATO_APPUNTAMENTO_PREVIEW_COLORS}
            onSegmentClick={byAppuntamento}
          />
        </SectionCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginTop: 20 }}>
        <SectionCard title={<>Hanno <Accent>sito web</Accent></>}>
          <PreviewStatList
            data={sitoChartData.map(s => ({ label: s.name, value: String(s.value), color: s.name === 'Sì' ? TEAL : s.name === 'No' ? ORANGE : undefined }))}
          />
        </SectionCard>
        <SectionCard title={<>Dimensione <Accent>azienda</Accent></>}>
          <PreviewBarChart data={dipendentiChartData.map(d => ({ label: d.range, value: d.count }))} onSegmentClick={byDipendenti} />
        </SectionCard>
        <SectionCard title={<>Industry</>}>
          <PreviewBarChart data={industryChartData.slice(0, 6).map(i => ({ label: i.name, value: i.value }))} onSegmentClick={byIndustry} />
        </SectionCard>
      </div>

      <Dialog open={modal.open} onOpenChange={o => setModal(m => ({ ...m, open: o }))}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{modal.title} — {modal.leads.length} lead</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1 mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Nome</th>
                  <th className="pb-2 font-medium text-muted-foreground">Azienda</th>
                  <th className="pb-2 font-medium text-muted-foreground">Stadio</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">Valore</th>
                </tr>
              </thead>
              <tbody>
                {modal.leads.map(lead => (
                  <tr key={lead.id} className="border-b last:border-0">
                    <td className="py-2">
                      <Link
                        href={`/leads-preview/${lead.id}`}
                        className="hover:underline font-medium"
                        onClick={() => setModal(m => ({ ...m, open: false }))}
                      >
                        {lead.nome} {lead.cognome}
                      </Link>
                    </td>
                    <td className="py-2 text-muted-foreground">{lead.azienda ?? '—'}</td>
                    <td className="py-2 text-muted-foreground">{lead.stadio_pipeline}</td>
                    <td className="py-2 text-right font-medium text-green-700">
                      {lead.valore != null ? `€${lead.valore.toLocaleString('it-IT')}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
