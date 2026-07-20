export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields } from '@/types'
import { sanitizeSearchTerm } from '@/lib/search'
import { LeadTable } from '@/components/leads/LeadTable'
import { LeadFilters } from '@/components/leads/LeadFilters'
import { LeadQuickStats } from '@/components/leads/LeadQuickStats'
import { CLOSED_STAGES } from '@/types'
import { Suspense } from 'react'

const PAGE_SIZE = 50

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stadio?: string; origine?: string; contattato?: string; scaduto?: string; page?: string; sortBy?: string; sortDir?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE
  const SORTABLE = ['nome', 'cognome', 'azienda', 'data_ultimo_contatto', 'valore', 'created_at']
  const sortBy = SORTABLE.includes(sp.sortBy ?? '') ? sp.sortBy! : 'created_at'
  const sortDir = sp.sortDir === 'asc' ? true : false

  const settings = await getSettings()
  const supabase = createServiceClient()

  let query = supabase.from('leads').select('*', { count: 'exact' })

  const q = sanitizeSearchTerm(sp.q)
  if (q) {
    query = query.or(`nome.ilike.%${q}%,cognome.ilike.%${q}%,azienda.ilike.%${q}%,email.ilike.%${q}%`)
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
    .order(sortBy, { ascending: sortDir, nullsFirst: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const computed = (leads ?? []).map(l => computeLeadFields(l))
  const hasFilters = !!(sp.q || (sp.stadio && sp.stadio !== 'all') || (sp.origine && sp.origine !== 'all') || sp.contattato || sp.scaduto === '1')

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - settings.followup_threshold_days)

  const [{ count: countAttivi }, { count: countScaduti }] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).not('stadio_pipeline', 'in', `(${CLOSED_STAGES.map(s => `"${s}"`).join(',')})`),
    supabase.from('leads').select('*', { count: 'exact', head: true }).not('data_ultimo_contatto', 'is', null).lte('data_ultimo_contatto', cutoff.toISOString().split('T')[0]),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lead</h1>
        <LeadQuickStats total={count ?? 0} attivi={countAttivi ?? 0} scaduti={countScaduti ?? 0} />
      </div>
      <Suspense>
        <LeadFilters stages={settings.pipeline_stages} leads={computed} />
      </Suspense>
      <LeadTable
        leads={computed}
        threshold={settings.followup_threshold_days}
        total={count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        hasFilters={hasFilters}
        sortBy={sortBy}
        sortDir={sp.sortDir === 'asc' ? 'asc' : 'desc'}
      />
    </div>
  )
}
