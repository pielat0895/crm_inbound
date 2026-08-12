'use client'
import { useState } from 'react'
import Link from 'next/link'
import { OwnerChart } from '@/components/dashboard/OwnerChart'
import { SitoChart } from '@/components/dashboard/SitoChart'
import { DipendentiChart } from '@/components/dashboard/DipendentiChart'
import { IndustryChart } from '@/components/dashboard/IndustryChart'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { PipelineChart } from '@/components/dashboard/PipelineChart'
import { ConversionChart } from '@/components/dashboard/ConversionChart'
import { AppuntamentoChart } from '@/components/dashboard/AppuntamentoChart'
import { OwnerConversionChart } from '@/components/dashboard/OwnerConversionChart'
import { EsitiChart } from '@/components/dashboard/EsitiChart'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export type SlimLead = {
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
  data_apertura: string | null
  owner: string | null
}

type Props = {
  sitoChartData: { name: string; value: number }[]
  dipendentiChartData: { range: string; count: number }[]
  industryChartData: { name: string; value: number }[]
  trendChartData: { label: string; count: number; media: number; month: string }[]
  pipelineData: { stage: string; count: number; revenue: number }[]
  conversionChartData: { origine: string; tassoVinti: number; tassoNonVinti: number; tasso: number }[]
  ownerChartData: { name: string; value: number }[]
  appuntamentoChartData: { stato: string; count: number }[]
  ownerConversionChartData: { owner: string; tassoVinti: number; tassoNonVinti: number; tasso: number }[]
  esitiChartData: { stato: string; count: number }[]
  leads: SlimLead[]
}

type ModalState = {
  open: boolean
  title: string
  leads: SlimLead[]
}

export function ChartsSection({
  sitoChartData,
  dipendentiChartData,
  industryChartData,
  trendChartData,
  pipelineData,
  conversionChartData,
  ownerChartData,
  appuntamentoChartData,
  ownerConversionChartData,
  esitiChartData,
  leads,
}: Props) {
  const [modal, setModal] = useState<ModalState>({ open: false, title: '', leads: [] })

  function open(title: string, filtered: SlimLead[]) {
    setModal({ open: true, title, leads: filtered })
  }

  function openDipendenti(range: string) {
    open(`Dimensione azienda: ${range}`, leads.filter(l =>
      range === 'N/D' ? !l.dipendenti : l.dipendenti === range
    ))
  }

  function openIndustry(name: string) {
    open(`Industry: ${name}`, leads.filter(l =>
      name === 'N/D' ? !l.industry : l.industry === name
    ))
  }

  function openTrend(month: string, label: string) {
    open(`Lead aperti: ${label}`, leads.filter(l =>
      l.data_apertura?.slice(0, 7) === month
    ))
  }

  function openPipeline(stage: string) {
    open(`Stadio: ${stage}`, leads.filter(l => l.stadio_pipeline === stage))
  }

  function openOwner(name: string) {
    open(`Owner: ${name}`, leads.filter(l =>
      name === 'N/D' ? !l.owner : l.owner === name
    ))
  }

  function openAppuntamento(stato: string) {
    open(`Stato appuntamento: ${stato}`, leads.filter(l => l.stato_appuntamento === stato))
  }

  function openEsiti(stato: string) {
    open(`Esito: ${stato}`, leads.filter(l => l.stato === stato))
  }

  function openConversion(origine: string) {
    open(`Origine: ${origine}`, leads.filter(l =>
      origine === 'N/D' ? !l.origine : l.origine === origine
    ))
  }

  return (
    <>
      <div className="rounded-lg border p-4">
        <h2 className="font-semibold mb-4">Trend mensile lead</h2>
        <TrendChart data={trendChartData} onSegmentClick={openTrend} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Pipeline per stadio</h2>
          <PipelineChart data={pipelineData} onSegmentClick={openPipeline} />
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Conversione per origine</h2>
          <ConversionChart data={conversionChartData} onSegmentClick={openConversion} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Lead per owner</h2>
          <OwnerChart data={ownerChartData} onSegmentClick={openOwner} />
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Stato appuntamento</h2>
          <AppuntamentoChart data={appuntamentoChartData} onSegmentClick={openAppuntamento} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Performance owner</h2>
          <OwnerConversionChart data={ownerConversionChartData} onSegmentClick={openOwner} />
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Distribuzione esiti</h2>
          <EsitiChart data={esitiChartData} onSegmentClick={openEsiti} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Hanno sito web</h2>
          <SitoChart data={sitoChartData} />
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Dimensione azienda (dipendenti)</h2>
          <DipendentiChart data={dipendentiChartData} onSegmentClick={openDipendenti} />
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Industry</h2>
          <IndustryChart data={industryChartData} onSegmentClick={openIndustry} />
        </div>
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
                        href={`/leads/${lead.id}`}
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
