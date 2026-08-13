export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields } from '@/types'
import { sanitizeSearchTerm } from '@/lib/search'
import { LeadTable } from '@/components/leads/LeadTable'
import { LeadFilters } from '@/components/leads/LeadFilters'
import { LeadQuickStats } from '@/components/leads/LeadQuickStats'
import { STATO_TERMINALI } from '@/types'
import { Suspense } from 'react'
import Link from 'next/link'
import { Wrench } from 'lucide-react'

const PAGE_SIZE = 50

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stadio?: string; origine?: string; contattato?: string; stato_appuntamento?: string; scaduto?: string; owner?: string; apertura_da?: string; apertura_a?: string; chiusura_da?: string; chiusura_a?: string; page?: string; sortBy?: string; sortDir?: string }>
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
  if (sp.stato_appuntamento && sp.stato_appuntamento !== 'all') {
    query = query.eq('stato_appuntamento', sp.stato_appuntamento)
  }
  if (sp.scaduto === '1') {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - settings.followup_threshold_days)
    query = query.not('data_ultimo_contatto', 'is', null)
      .lte('data_ultimo_contatto', cutoff.toISOString().split('T')[0])
  }
  if (sp.owner && sp.owner !== 'all') {
    query = query.eq('owner', sp.owner)
  }
  if (sp.apertura_da) query = query.gte('data_apertura', sp.apertura_da)
  if (sp.apertura_a) query = query.lte('data_apertura', sp.apertura_a)
  if (sp.chiusura_da) query = query.gte('data_chiusura', sp.chiusura_da)
  if (sp.chiusura_a) query = query.lte('data_chiusura', sp.chiusura_a)

  const { data: leads, count } = await query
    .order(sortBy, { ascending: sortDir, nullsFirst: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const computed = (leads ?? []).map(l => computeLeadFields(l))
  const hasFilters = !!(sp.q || (sp.stadio && sp.stadio !== 'all') || (sp.origine && sp.origine !== 'all') || sp.contattato || (sp.stato_appuntamento && sp.stato_appuntamento !== 'all') || sp.scaduto === '1' || (sp.owner && sp.owner !== 'all') || sp.apertura_da || sp.apertura_a || sp.chiusura_da || sp.chiusura_a)

  const { data: ownerRows } = await supabase.from('leads').select('owner').not('owner', 'is', null)
  const availableOwners = [...new Set((ownerRows ?? []).map(r => r.owner as string))].sort()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - settings.followup_threshold_days)

  const [{ count: countAttivi }, { count: countScaduti }, { count: countDaSistemare }] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).or(`stato.is.null,stato.not.in.(${STATO_TERMINALI.map(s => `"${s}"`).join(',')})`),
    supabase.from('leads').select('*', { count: 'exact', head: true }).not('data_ultimo_contatto', 'is', null).lte('data_ultimo_contatto', cutoff.toISOString().split('T')[0]),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('stadio_pipeline', 'Da sistemare'),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Lead</h1>
        <div className="flex items-center gap-4">
          {(countDaSistemare ?? 0) > 0 && (
            <Link
              href="/leads/da-sistemare"
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 hover:bg-amber-200 transition-colors"
            >
              <Wrench className="h-3.5 w-3.5" />
              {countDaSistemare} da sistemare
            </Link>
          )}
          <LeadQuickStats total={count ?? 0} attivi={countAttivi ?? 0} scaduti={countScaduti ?? 0} />
        </div>
      </div>
      <Suspense>
        <LeadFilters stages={settings.pipeline_stages} owners={availableOwners} leads={computed} />
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
