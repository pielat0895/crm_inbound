'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { LeadWithComputed } from '@/types'
import { PLUM, ORANGE, GRAY_BORDER, GRAY_500 } from '@/components/dashboard-preview/tokens'

type Props = {
  leads: LeadWithComputed[]
  stages: string[]
  threshold: number
}

const th: React.CSSProperties = { padding: '14px 18px', textAlign: 'left', font: "700 10px/1 'Open Sans'", letterSpacing: '.1em', color: GRAY_500 }

export function DaSistemareTablePreview({ leads, stages, threshold }: Props) {
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
      <div style={{ background: '#fff', border: `1px solid ${GRAY_BORDER}`, padding: '40px 18px', textAlign: 'center' }}>
        <p style={{ margin: 0, font: "700 13px/1.3 'Open Sans'" }}>Tutti sistemati!</p>
        <p style={{ margin: '6px 0 0', font: "400 12px/1.4 'Open Sans'", color: GRAY_500 }}>Nessun lead con stadio da assegnare.</p>
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', border: `1px solid ${GRAY_BORDER}`, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${PLUM}` }}>
            <th style={th}>NOME</th>
            <th style={th}>AZIENDA</th>
            <th style={th}>ORIGINE</th>
            <th style={th}>ULTIMO CONTATTO</th>
            <th style={th}>ASSEGNA STADIO</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(lead => {
            const overdue = lead.stato_lead !== 'Chiuso' && lead.giorni_ultimo_contatto !== null && lead.giorni_ultimo_contatto >= threshold
            return (
              <tr
                key={lead.id}
                onClick={() => router.push(`/leads/${lead.id}`)}
                className="hover:bg-[#faf9f7]"
                style={{ borderBottom: `1px solid ${GRAY_BORDER}`, cursor: 'pointer' }}
              >
                <td style={{ padding: '13px 18px', font: "600 13px/1.3 'Open Sans'" }}>
                  {`${lead.nome ?? ''} ${lead.cognome ?? ''}`.trim() || '—'}
                </td>
                <td style={{ padding: '13px 18px', font: "400 13px/1.3 'Open Sans'", color: GRAY_500 }}>{lead.azienda ?? '—'}</td>
                <td style={{ padding: '13px 18px', font: "400 12px/1.3 'Open Sans'", color: GRAY_500 }}>{lead.origine ?? '—'}</td>
                <td style={{ padding: '13px 18px', font: "400 12px/1.3 'Open Sans'", color: GRAY_500 }}>
                  {lead.data_ultimo_contatto ? new Date(lead.data_ultimo_contatto).toLocaleDateString('it-IT') : 'mai'}{' '}
                  {overdue && (
                    <span style={{ font: "700 10px/1 'Open Sans'", letterSpacing: '.06em', color: ORANGE }}>
                      {lead.giorni_ultimo_contatto} GG
                    </span>
                  )}
                </td>
                <td style={{ padding: '13px 18px' }} onClick={e => e.stopPropagation()}>
                  <select
                    value=""
                    disabled={savingId === lead.id}
                    onChange={e => e.target.value && handleAssign(lead.id, e.target.value)}
                    style={{ width: 190, height: 34, border: `1px solid ${GRAY_BORDER}`, background: '#fff', padding: '0 10px', font: "400 13px/1 'Open Sans'" }}
                  >
                    <option value="">{savingId === lead.id ? 'Salvataggio...' : 'Scegli stadio'}</option>
                    {stages.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
