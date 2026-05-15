export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields } from '@/types'
import { LeadTable } from '@/components/leads/LeadTable'
import { LeadFilters } from '@/components/leads/LeadFilters'
import { Suspense } from 'react'

const PAGE_SIZE = 50

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stadio?: string; origine?: string; contattato?: string; scaduto?: string; page?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  const settings = await getSettings()
  const supabase = createServiceClient()

  let query = supabase.from('leads').select('*', { count: 'exact' })

  if (sp.q) {
    query = query.or(`nome.ilike.%${sp.q}%,cognome.ilike.%${sp.q}%,azienda.ilike.%${sp.q}%,email.ilike.%${sp.q}%`)
  }
  if (sp.stadio && sp.stadio !== 'all') {
    query = query.eq('stadio_pipeline', sp.stadio)
  }
  if (sp.origine && sp.origine !== 'all') {
    query = query.eq('origine', sp.origine)
  }
  if (sp.contattato === 'si') {
    query = query.eq('contattato', true)
  } else if (sp.contattato === 'no') {
    query = query.eq('contattato', false)
  }
  if (sp.scaduto === '1') {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - settings.followup_threshold_days)
    query = query.not('data_ultimo_contatto', 'is', null)
      .lte('data_ultimo_contatto', cutoff.toISOString().split('T')[0])
  }

  const { data: leads, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const computed = (leads ?? []).map(l => computeLeadFields(l))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Lead</h1>
      <Suspense>
        <LeadFilters stages={settings.pipeline_stages} leads={computed} />
      </Suspense>
      <LeadTable
        leads={computed}
        threshold={settings.followup_threshold_days}
        total={count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </div>
  )
}
