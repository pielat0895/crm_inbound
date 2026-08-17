'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { LeadWithComputed } from '@/types'
import { STATO_APPUNTAMENTO_DEFAULT } from '@/types'
import { LeadEditDrawer } from '@/components/leads/LeadEditDrawer'
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PLUM, ORANGE, GRAY_BORDER, GRAY_500 } from '@/components/dashboard-preview/tokens'
import { stageBadgeColors, statoBadgeColors, appuntamentoBadgeColors } from '@/components/preview/badge-colors'

type Props = {
  leads: LeadWithComputed[]
  threshold: number
  total: number
  page: number
  pageSize: number
  hasFilters?: boolean
}

function Badge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '3px 8px', font: "700 9px/1.3 'Open Sans'", letterSpacing: '.1em', background: bg, color: fg }}>
      {label.toUpperCase()}
    </span>
  )
}

export function LeadTablePreview({ leads, threshold, total, page, pageSize, hasFilters }: Props) {
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
    if (!res.ok) { toast.error("Errore durante l'eliminazione"); return }
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

  const th: React.CSSProperties = { padding: '14px 18px', textAlign: 'left', font: "700 10px/1 'Open Sans'", letterSpacing: '.1em', color: GRAY_500 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: '#fff', border: `1px solid ${GRAY_BORDER}`, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${PLUM}` }}>
              <th style={th}>NOME</th>
              <th style={th}>AZIENDA</th>
              <th style={th}>ORIGINE</th>
              <th style={th}>STADIO / STATO</th>
              <th style={th}>APPUNTAMENTO</th>
              <th style={th}>ULTIMO CONTATTO</th>
              <th style={{ ...th, textAlign: 'right' }}>VALORE</th>
              <th style={{ ...th, textAlign: 'right' }}>AZIONI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(lead => {
              const late = lead.stato_lead !== 'Chiuso' && lead.giorni_ultimo_contatto !== null && lead.giorni_ultimo_contatto >= threshold
              return (
                <tr
                  key={lead.id}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  className="hover:bg-[#faf9f7]"
                  style={{ borderBottom: `1px solid ${GRAY_BORDER}`, cursor: 'pointer' }}
                >
                  <td style={{ padding: '13px 18px', font: "600 13px/1.3 'Open Sans'", borderLeft: late ? `3px solid ${ORANGE}` : '3px solid transparent' }}>
                    {`${lead.nome ?? ''} ${lead.cognome ?? ''}`.trim() || '—'}
                  </td>
                  <td style={{ padding: '13px 18px', font: "400 13px/1.3 'Open Sans'", color: GRAY_500 }}>{lead.azienda ?? '—'}</td>
                  <td style={{ padding: '13px 18px', font: "400 12px/1.3 'Open Sans'", color: GRAY_500 }}>{lead.origine ?? '—'}</td>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <Badge label={lead.stadio_pipeline} {...stageBadgeColors(lead.stadio_pipeline)} />
                      {lead.stato && <Badge label={lead.stato} {...statoBadgeColors(lead.stato)} />}
                      {lead.stato_appuntamento !== STATO_APPUNTAMENTO_DEFAULT && (
                        <Badge label={lead.stato_appuntamento} {...appuntamentoBadgeColors(lead.stato_appuntamento)} />
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '13px 18px', font: "400 12px/1.3 'Open Sans'", color: GRAY_500 }}>
                    {lead.appuntamento
                      ? new Date(lead.appuntamento).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
                      : '—'}
                  </td>
                  <td style={{ padding: '13px 18px', font: "400 12px/1.3 'Open Sans'", color: GRAY_500 }}>
                    {lead.data_ultimo_contatto ? new Date(lead.data_ultimo_contatto).toLocaleDateString('it-IT') : 'mai'}{' '}
                    {late && (
                      <span style={{ font: "700 10px/1 'Open Sans'", letterSpacing: '.06em', color: ORANGE }}>
                        {lead.giorni_ultimo_contatto} GG
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '13px 18px', textAlign: 'right', font: "700 13px/1.3 'Open Sans'" }}>
                    {lead.valore != null ? `€${lead.valore.toLocaleString('it-IT')}` : '—'}
                  </td>
                  <td style={{ padding: '13px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <button
                        onClick={e => { e.stopPropagation(); setEditingLead(lead) }}
                        aria-label="Modifica lead"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', font: "600 11px/1 'Open Sans'", color: GRAY_500 }}
                      >
                        MODIFICA
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeletingLead(lead) }}
                        aria-label="Elimina lead"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', font: "600 11px/1 'Open Sans'", color: ORANGE }}
                      >
                        ELIMINA
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '40px 18px', textAlign: 'center', font: "400 13px/1 'Open Sans'", color: GRAY_500 }}>
                  {hasFilters ? 'Nessun risultato. Prova a cambiare i filtri.' : 'Nessun lead ancora.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', font: "400 12px/1 'Open Sans'", color: GRAY_500 }}>
        <span>{total} lead totali{totalPages > 1 ? ` · pagina ${page} di ${totalPages}` : ''}</span>
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              disabled={page <= 1}
              onClick={() => goPage(page - 1)}
              style={{ border: 'none', background: 'transparent', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1, font: "700 11px/1 'Open Sans'" }}
            >
              ← PREC
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => goPage(page + 1)}
              style={{ border: 'none', background: 'transparent', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1, font: "700 11px/1 'Open Sans'" }}
            >
              SUCC →
            </button>
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
                ? (`${deletingLead.nome ?? ''} ${deletingLead.cognome ?? ''}`.trim() || deletingLead.azienda || 'Questo lead')
                : ''}{' '}
              verrà eliminato definitivamente. L&apos;azione non è reversibile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingLead(null)} disabled={deleting}>Annulla</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
