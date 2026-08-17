export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields } from '@/types'
import { sanitizeSearchTerm } from '@/lib/search'
import { STATO_TERMINALI } from '@/types'
import { leadARischio } from '@/lib/tasks'
import { LeadTablePreview } from '@/components/leads-preview/LeadTablePreview'
import { LeadFiltersPreview } from '@/components/leads-preview/LeadFiltersPreview'
import { PreviewShell } from '@/components/preview/PreviewShell'
import { ORANGE } from '@/components/dashboard-preview/tokens'

const PAGE_SIZE = 50

export default async function LeadsPreviewPage({
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
      .or('stato_lead.is.null,stato_lead.neq.Chiuso')
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

  const now = new Date()
  const computed = (leads ?? []).map(l => computeLeadFields(l, now))
  const hasFilters = !!(sp.q || (sp.stadio && sp.stadio !== 'all') || (sp.origine && sp.origine !== 'all') || sp.contattato || (sp.stato_appuntamento && sp.stato_appuntamento !== 'all') || sp.scaduto === '1' || (sp.owner && sp.owner !== 'all') || sp.apertura_da || sp.apertura_a || sp.chiusura_da || sp.chiusura_a)

  const { data: ownerRows } = await supabase.from('leads').select('owner').not('owner', 'is', null)
  const availableOwners = [...new Set((ownerRows ?? []).map(r => r.owner as string))].sort()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - settings.followup_threshold_days)

  const [{ data: allLeadRows }, { count: countAttivi }, { count: countScaduti }, { count: countDaSistemare }] = await Promise.all([
    supabase.from('leads').select('*'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).or(`stato.is.null,stato.not.in.(${STATO_TERMINALI.map(s => `"${s}"`).join(',')})`),
    supabase.from('leads').select('*', { count: 'exact', head: true }).not('data_ultimo_contatto', 'is', null).lte('data_ultimo_contatto', cutoff.toISOString().split('T')[0]),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('stadio_pipeline', 'Da sistemare'),
  ])

  const allComputed = (allLeadRows ?? []).map(l => computeLeadFields(l, now))
  const rischio = leadARischio(allComputed, now, settings.followup_threshold_days)

  return (
    <PreviewShell
      pageLabel="ANAGRAFICA"
      titleAccent="TUTTI"
      titleRest="I LEAD"
      headerStats={[
        { value: String(count ?? 0), label: 'TOTALI' },
        { value: String(countAttivi ?? 0), label: 'ATTIVI', color: ORANGE },
        { value: String(countScaduti ?? 0), label: 'FOLLOW-UP SCADUTI', color: ORANGE },
      ]}
      footerNote={`${allComputed.length} lead · ${rischio.length} follow-up scaduti`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <LeadFiltersPreview
          stages={settings.pipeline_stages}
          owners={availableOwners}
          leads={computed}
          countDaSistemare={countDaSistemare ?? 0}
        />
        <LeadTablePreview
          leads={computed}
          threshold={settings.followup_threshold_days}
          total={count ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          hasFilters={hasFilters}
        />
      </div>
    </PreviewShell>
  )
}
