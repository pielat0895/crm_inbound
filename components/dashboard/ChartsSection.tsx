'use client'
import { useState } from 'react'
import Link from 'next/link'
import { SitoChart } from '@/components/dashboard/SitoChart'
import { DipendentiChart } from '@/components/dashboard/DipendentiChart'
import { IndustryChart } from '@/components/dashboard/IndustryChart'
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
  valore: number | null
  industry: string | null
  dipendenti: string | null
}

type Props = {
  sitoChartData: { name: string; value: number }[]
  dipendentiChartData: { range: string; count: number }[]
  industryChartData: { name: string; value: number }[]
  leads: SlimLead[]
}

type ModalState = {
  open: boolean
  title: string
  leads: SlimLead[]
}

export function ChartsSection({ sitoChartData, dipendentiChartData, industryChartData, leads }: Props) {
  const [modal, setModal] = useState<ModalState>({ open: false, title: '', leads: [] })

  function openDipendenti(range: string) {
    const filtered = leads.filter(l =>
      range === 'N/D' ? !l.dipendenti : l.dipendenti === range
    )
    setModal({ open: true, title: `Dimensione azienda: ${range}`, leads: filtered })
  }

  function openIndustry(name: string) {
    const filtered = leads.filter(l =>
      name === 'N/D' ? !l.industry : l.industry === name
    )
    setModal({ open: true, title: `Industry: ${name}`, leads: filtered })
  }

  return (
    <>
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

      <Dialog open={modal.open} onOpenChange={open => setModal(m => ({ ...m, open }))}>
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
