'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { LeadWithComputed } from '@/types'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OverdueBadge } from '@/components/ui/OverdueBadge'
import { PartyPopper, Pencil } from 'lucide-react'

type Props = {
  leads: LeadWithComputed[]
  stages: string[]
  threshold: number
}

export function DaSistemareTable({ leads, stages, threshold }: Props) {
  const router = useRouter()
  const [rows, setRows] = useState(leads)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function handleAssign(leadId: string, stadio_pipeline: string) {
    setSavingId(leadId)
    const res = await fetch(`/api/leads/${leadId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stadio_pipeline }),
    })
    setSavingId(null)
    if (!res.ok) { toast.error('Errore durante il salvataggio'); return }
    toast.success(`Assegnato a ${stadio_pipeline}`)
    setRows(prev => prev.filter(l => l.id !== leadId))
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border py-10">
        <EmptyState
          icon={PartyPopper}
          title="Tutti sistemati!"
          description="Nessun lead con stadio da assegnare."
        />
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-2 text-left font-medium">Nome</th>
            <th className="px-4 py-2 text-left font-medium">Azienda</th>
            <th className="px-4 py-2 text-left font-medium">Origine</th>
            <th className="px-4 py-2 text-left font-medium">Ultimo contatto</th>
            <th className="px-4 py-2 text-left font-medium">Assegna stadio</th>
            <th className="px-4 py-2 text-right font-medium">Dettaglio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(lead => (
            <tr key={lead.id} className="border-b hover:bg-muted/30 transition-colors">
              <td className="px-4 py-2 font-medium">
                {`${lead.nome ?? ''} ${lead.cognome ?? ''}`.trim() || '—'}
              </td>
              <td className="px-4 py-2 text-muted-foreground">{lead.azienda ?? '—'}</td>
              <td className="px-4 py-2 text-muted-foreground">{lead.origine ?? '—'}</td>
              <td className="px-4 py-2 text-muted-foreground">
                <div className="flex items-center gap-2">
                  {lead.data_ultimo_contatto ? new Date(lead.data_ultimo_contatto).toLocaleDateString('it-IT') : '—'}
                  <OverdueBadge giorni={lead.giorni_ultimo_contatto} threshold={threshold} />
                </div>
              </td>
              <td className="px-4 py-2">
                <Select
                  value=""
                  disabled={savingId === lead.id}
                  onValueChange={v => v && handleAssign(lead.id, v)}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder={savingId === lead.id ? 'Salvataggio...' : 'Scegli stadio'} />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-4 py-2 text-right">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Apri dettaglio lead"
                  onClick={() => router.push(`/leads/${lead.id}`)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
