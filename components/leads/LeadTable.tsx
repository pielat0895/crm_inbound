'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { LeadWithComputed } from '@/types'
import { OverdueBadge } from '@/components/ui/OverdueBadge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SortableHeader } from './SortableHeader'
import { LeadEditDrawer } from './LeadEditDrawer'
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Users, SearchX, Pencil, Trash2 } from 'lucide-react'
import { STAGE_BADGE_CLASSES, STATO_BADGE_CLASSES, STATO_APPUNTAMENTO_BADGE_CLASSES } from '@/lib/stage-colors'

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

  const [rows, setRows] = useState(leads)
  const [editingLead, setEditingLead] = useState<LeadWithComputed | null>(null)
  const [deletingLead, setDeletingLead] = useState<LeadWithComputed | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { setRows(leads) }, [leads])

  async function handleDelete() {
    if (!deletingLead) return
    setDeleting(true)
    const res = await fetch(`/api/leads/${deletingLead.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) { toast.error('Errore durante l\'eliminazione'); return }
    toast.success('Lead eliminato')
    setRows(prev => prev.filter(l => l.id !== deletingLead.id))
    setDeletingLead(null)
    router.refresh()
  }

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
              <th className="px-4 py-2 text-right font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(lead => (
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
                  <div className="flex flex-wrap gap-1">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_BADGE_CLASSES[lead.stadio_pipeline] ?? 'bg-gray-100 text-gray-600'}`}>
                      {lead.stadio_pipeline}
                    </span>
                    {lead.stato && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATO_BADGE_CLASSES[lead.stato] ?? 'bg-gray-100 text-gray-600'}`}>
                        {lead.stato}
                      </span>
                    )}
                    {lead.stato_appuntamento !== 'Non schedulato' && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATO_APPUNTAMENTO_BADGE_CLASSES[lead.stato_appuntamento] ?? 'bg-gray-100 text-gray-600'}`}>
                        {lead.stato_appuntamento}
                      </span>
                    )}
                  </div>
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
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Modifica lead"
                      onClick={(e) => { e.stopPropagation(); setEditingLead(lead) }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      aria-label="Elimina lead"
                      onClick={(e) => { e.stopPropagation(); setDeletingLead(lead) }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8}>
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

      <LeadEditDrawer
        lead={editingLead}
        open={!!editingLead}
        onClose={() => setEditingLead(null)}
        onSaved={() => { setEditingLead(null); router.refresh() }}
      />

      <Dialog open={!!deletingLead} onOpenChange={(o) => { if (!o) setDeletingLead(null) }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Eliminare lead?</DialogTitle>
            <DialogDescription>
              {deletingLead
                ? (`${deletingLead.nome ?? ''} ${deletingLead.cognome ?? ''}`.trim()
                    || deletingLead.azienda || 'Questo lead')
                : ''}{' '}
              verrà eliminato definitivamente. L&apos;azione non è reversibile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingLead(null)} disabled={deleting}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
