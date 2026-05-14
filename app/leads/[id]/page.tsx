export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields } from '@/types'
import { LeadForm } from '@/components/leads/LeadForm'
import { InteractionTimeline } from '@/components/leads/InteractionTimeline'
import { Badge } from '@/components/ui/badge'
import { notFound } from 'next/navigation'
import { CalendarButton } from './CalendarButton'

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

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {computed.nome} {computed.cognome}
            {computed.azienda && (
              <span className="text-muted-foreground font-normal ml-2">— {computed.azienda}</span>
            )}
          </h1>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge>{computed.stadio_pipeline}</Badge>
            {computed.giorni_aperto !== null && (
              <Badge variant="outline">Aperto da {computed.giorni_aperto}gg</Badge>
            )}
            {computed.giorni_ultimo_contatto !== null &&
              computed.giorni_ultimo_contatto >= settings.followup_threshold_days && (
                <Badge variant="destructive">
                  Follow-up scaduto: {computed.giorni_ultimo_contatto}gg
                </Badge>
              )}
          </div>
        </div>
        {computed.ricontattare && <CalendarButton lead={computed} />}
      </div>

      <LeadForm lead={computed} stages={settings.pipeline_stages} />

      <hr />

      <InteractionTimeline leadId={id} interactions={interactions ?? []} />
    </div>
  )
}
