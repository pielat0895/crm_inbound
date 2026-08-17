export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields, STATO_APPUNTAMENTO_DEFAULT } from '@/types'
import { notFound } from 'next/navigation'
import { leadARischio } from '@/lib/tasks'
import { PreviewShell } from '@/components/preview/PreviewShell'
import { LeadDetailTabsPreview } from '@/components/leads-preview/LeadDetailTabsPreview'
import { CalendarButtonPreview } from '@/components/leads-preview/CalendarButtonPreview'
import { DeleteLeadButtonPreview } from '@/components/leads-preview/DeleteLeadButtonPreview'
import { PLUM, ORANGE, GRAY_BORDER, GRAY_500 } from '@/components/dashboard-preview/tokens'
import { stageBadgeColors, statoBadgeColors, appuntamentoBadgeColors } from '@/components/preview/badge-colors'

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const [{ data: lead, error }, { data: interactions }, settings, { data: allLeadRows }] = await Promise.all([
    supabase.from('leads').select('*').eq('id', id).single(),
    supabase.from('interactions').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    getSettings(),
    supabase.from('leads').select('*'),
  ])

  if (error || !lead) notFound()

  const now = new Date()
  const computed = computeLeadFields(lead, now)
  const allComputed = (allLeadRows ?? []).map(l => computeLeadFields(l, now))
  const rischio = leadARischio(allComputed, now, settings.followup_threshold_days)

  const badges = [
    { label: computed.stadio_pipeline, ...stageBadgeColors(computed.stadio_pipeline) },
    ...(computed.stato ? [{ label: computed.stato, ...statoBadgeColors(computed.stato) }] : []),
    ...(computed.stato_appuntamento !== STATO_APPUNTAMENTO_DEFAULT
      ? [{ label: computed.stato_appuntamento, ...appuntamentoBadgeColors(computed.stato_appuntamento) }]
      : []),
  ]

  return (
    <PreviewShell
      pageLabel={`SCHEDA LEAD · ${(computed.origine ?? '—').toUpperCase()}`}
      titleAccent={(computed.nome ?? '').toUpperCase()}
      titleRest={(computed.cognome ?? '').toUpperCase()}
      sub={[computed.ruolo, computed.azienda].filter(Boolean).join(' · ')}
      headerStats={[
        { value: computed.giorni_aperto !== null ? String(computed.giorni_aperto) : '—', label: 'GIORNI IN PIPELINE' },
        { value: computed.valore != null ? `€${computed.valore.toLocaleString('it-IT')}` : '—', label: 'VALORE DEAL', color: ORANGE },
      ]}
      footerNote={`${allComputed.length} lead · ${rischio.length} follow-up scaduti`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <div style={{ background: '#fff', border: `1px solid ${GRAY_BORDER}`, padding: '24px 26px' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {badges.map(b => (
              <span
                key={b.label}
                style={{ display: 'inline-block', padding: '4px 9px', font: "700 9px/1.3 'Open Sans'", letterSpacing: '.1em', background: b.bg, color: b.fg }}
              >
                {b.label.toUpperCase()}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 34, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: '0 0 6px', font: "600 10px/1 'Open Sans'", letterSpacing: '.12em', color: GRAY_500 }}>CONTATTO</p>
              <p style={{ margin: 0, font: "400 13px/1.7 'Open Sans'" }}>
                {computed.ruolo}<br />
                {computed.email && <a href={`mailto:${computed.email}`} style={{ color: PLUM }}>{computed.email}</a>}<br />
                {computed.tel && <a href={`tel:${computed.tel}`} style={{ color: PLUM }}>{computed.tel}</a>}
              </p>
            </div>
            {computed.valore != null && (
              <div style={{ borderLeft: `1px solid ${GRAY_BORDER}`, paddingLeft: 34 }}>
                <p style={{ margin: '0 0 6px', font: "600 10px/1 'Open Sans'", letterSpacing: '.12em', color: GRAY_500 }}>VALORE</p>
                <p style={{ margin: 0, font: "700 30px/1 'Open Sans'", color: ORANGE }}>€{computed.valore.toLocaleString('it-IT')}</p>
              </div>
            )}
            {computed.giorni_aperto !== null && (
              <div style={{ borderLeft: `1px solid ${GRAY_BORDER}`, paddingLeft: 34 }}>
                <p style={{ margin: '0 0 6px', font: "600 10px/1 'Open Sans'", letterSpacing: '.12em', color: GRAY_500 }}>APERTO DA</p>
                <p style={{ margin: 0, font: "700 30px/1 'Open Sans'" }}>{computed.giorni_aperto}<span style={{ font: "400 13px/1 'Open Sans'", color: GRAY_500 }}>gg</span></p>
              </div>
            )}
            {computed.giorni_ultimo_contatto !== null && (
              <div style={{ borderLeft: `1px solid ${GRAY_BORDER}`, paddingLeft: 34 }}>
                <p style={{ margin: '0 0 6px', font: "600 10px/1 'Open Sans'", letterSpacing: '.12em', color: GRAY_500 }}>ULTIMO CONTATTO</p>
                <p style={{ margin: 0, font: "700 30px/1 'Open Sans'" }}>{computed.giorni_ultimo_contatto}<span style={{ font: "400 13px/1 'Open Sans'", color: GRAY_500 }}>gg fa</span></p>
              </div>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              {computed.ricontattare && <CalendarButtonPreview lead={computed} />}
              <DeleteLeadButtonPreview
                leadId={computed.id}
                leadName={`${computed.nome ?? ''} ${computed.cognome ?? ''}`.trim() || computed.email}
              />
            </div>
          </div>
        </div>

        <LeadDetailTabsPreview lead={computed} interactions={interactions ?? []} stages={settings.pipeline_stages} />
      </div>
    </PreviewShell>
  )
}
