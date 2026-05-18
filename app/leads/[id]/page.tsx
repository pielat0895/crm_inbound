export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields } from '@/types'
import { LeadDetailTabs } from './LeadDetailTabs'
import { Badge } from '@/components/ui/badge'
import { notFound } from 'next/navigation'
import { CalendarButton } from './CalendarButton'
import { DeleteLeadButton } from './DeleteLeadButton'
import { Mail, Phone, Building2, Euro, Clock } from 'lucide-react'

const STAGE_COLORS: Record<string, string> = {
  'Lead In':        'bg-blue-100 text-blue-700',
  'Discovery':      'bg-violet-100 text-violet-700',
  'Proposal Sent':  'bg-amber-100 text-amber-700',
  'Chiuso (Vinto)': 'bg-green-100 text-green-700',
  'Chiuso (Perso)': 'bg-red-100 text-red-700',
  'Cliente':        'bg-emerald-100 text-emerald-700',
  'Studente':       'bg-gray-100 text-gray-600',
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const [
    { data: lead, error },
    { data: interactions },
    settings,
  ] = await Promise.all([
    supabase.from('leads').select('*').eq('id', id).single(),
    supabase.from('interactions').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    getSettings(),
  ])

  if (error || !lead) notFound()

  const computed = computeLeadFields(lead)
  const stageClass = STAGE_COLORS[computed.stadio_pipeline] ?? 'bg-gray-100 text-gray-600'
  const isOverdue = computed.giorni_ultimo_contatto !== null &&
    computed.giorni_ultimo_contatto >= settings.followup_threshold_days

  return (
    <div className="space-y-6">

      {/* Header card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-3 min-w-0">
            <div>
              <h1 className="text-2xl font-bold leading-tight">
                {computed.nome} {computed.cognome}
              </h1>
              {(computed.azienda || computed.ruolo) && (
                <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  {[computed.ruolo, computed.azienda].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stageClass}`}>
                {computed.stadio_pipeline}
              </span>
              {computed.giorni_aperto !== null && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Aperto da {computed.giorni_aperto}gg
                </Badge>
              )}
              {computed.valore != null && (
                <Badge variant="outline" className="text-xs text-green-700 border-green-200">
                  <Euro className="h-3 w-3 mr-1" />
                  {computed.valore.toLocaleString('it-IT')}
                </Badge>
              )}
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  Follow-up scaduto: {computed.giorni_ultimo_contatto}gg
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              {computed.email && (
                <a href={`mailto:${computed.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <Mail className="h-3.5 w-3.5" />
                  {computed.email}
                </a>
              )}
              {computed.tel && (
                <a href={`tel:${computed.tel}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <Phone className="h-3.5 w-3.5" />
                  {computed.tel}
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {computed.ricontattare && <CalendarButton lead={computed} />}
            <DeleteLeadButton
              leadId={computed.id}
              leadName={`${computed.nome ?? ''} ${computed.cognome ?? ''}`.trim() || computed.email}
            />
          </div>
        </div>
      </div>

      <LeadDetailTabs
        lead={computed}
        interactions={interactions ?? []}
        stages={settings.pipeline_stages}
      />

    </div>
  )
}
