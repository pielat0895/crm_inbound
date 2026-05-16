'use client'
import { useRouter } from 'next/navigation'
import type { LeadWithComputed } from '@/types'
import { OverdueBadge } from '@/components/ui/OverdueBadge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SortableHeader } from './SortableHeader'
import { ChevronLeft, ChevronRight, Users, SearchX } from 'lucide-react'

const STAGE_COLORS: Record<string, string> = {
  'Lead In':        'bg-blue-100 text-blue-700',
  'Discovery':      'bg-violet-100 text-violet-700',
  'Proposal Sent':  'bg-amber-100 text-amber-700',
  'Chiuso (Vinto)': 'bg-green-100 text-green-700',
  'Chiuso (Perso)': 'bg-red-100 text-red-700',
  'Cliente':        'bg-emerald-100 text-emerald-700',
  'Studente':       'bg-gray-100 text-gray-600',
}

type Props = {
  leads: LeadWithComputed[]
  threshold: number
  total: number
  page: number
  pageSize: number
  hasFilters?: boolean
  sortBy?: string
  sortDir?: string
}

export function LeadTable({ leads, threshold, total, page, pageSize, hasFilters, sortBy = 'created_at', sortDir = 'desc' }: Props) {
  const router = useRouter()
  const totalPages = Math.ceil(total / pageSize)

  function goPage(p: number) {
    const url = new URL(window.location.href)
    url.searchParams.set('page', String(p))
    router.push(url.pathname + '?' + url.searchParams.toString())
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left"><SortableHeader label="Nome" column="nome" currentSort={sortBy} currentDir={sortDir} /></th>
              <th className="px-4 py-2 text-left"><SortableHeader label="Azienda" column="azienda" currentSort={sortBy} currentDir={sortDir} /></th>
              <th className="px-4 py-2 text-left font-medium">Origine</th>
              <th className="px-4 py-2 text-left font-medium">Stadio</th>
              <th className="px-4 py-2 text-left"><SortableHeader label="Ultimo contatto" column="data_ultimo_contatto" currentSort={sortBy} currentDir={sortDir} /></th>
              <th className="px-4 py-2 text-left font-medium">Follow-up</th>
              <th className="px-4 py-2 text-left"><SortableHeader label="Valore" column="valore" currentSort={sortBy} currentDir={sortDir} /></th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr
                key={lead.id}
                className="border-b cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => router.push(`/leads/${lead.id}`)}
              >
                <td className="px-4 py-2 font-medium">
                  {`${lead.nome ?? ''} ${lead.cognome ?? ''}`.trim() || '—'}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{lead.azienda ?? '—'}</td>
                <td className="px-4 py-2 text-muted-foreground">{lead.origine ?? '—'}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[lead.stadio_pipeline] ?? 'bg-gray-100 text-gray-600'}`}>
                    {lead.stadio_pipeline}
                  </span>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {lead.data_ultimo_contatto ? new Date(lead.data_ultimo_contatto).toLocaleDateString('it-IT') : '—'}
                </td>
                <td className="px-4 py-2">
                  <OverdueBadge giorni={lead.giorni_ultimo_contatto} threshold={threshold} />
                </td>
                <td className="px-4 py-2">
                  {lead.valore != null ? `€${lead.valore.toLocaleString('it-IT')}` : '—'}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={hasFilters ? SearchX : Users}
                    title={hasFilters ? 'Nessun risultato' : 'Nessun lead ancora'}
                    description={hasFilters ? 'Prova a cambiare i filtri o la ricerca.' : 'Aggiungi il tuo primo lead per iniziare.'}
                    action={hasFilters ? undefined : { label: 'Aggiungi lead', href: '/leads/new' }}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} lead totali</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>Pagina {page} di {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
