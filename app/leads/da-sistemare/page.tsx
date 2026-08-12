export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields } from '@/types'
import { DaSistemareTable } from '@/components/leads/DaSistemareTable'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function DaSistemarePage() {
  const settings = await getSettings()
  const supabase = createServiceClient()

  const { data: leads, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('stadio_pipeline', 'Da sistemare')
    .order('created_at', { ascending: false })

  const computed = (leads ?? []).map(l => computeLeadFields(l))

  return (
    <div className="space-y-4">
      <div>
        <Link href="/leads" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Torna ai lead
        </Link>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-2xl font-bold">Da sistemare</h1>
          <span className="text-sm text-muted-foreground">{count ?? 0} da assegnare a uno stadio</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Lead con stadio pipeline non recuperato dalla migrazione dati. Assegna lo stadio corretto: la riga sparisce appena salvata.
        </p>
      </div>
      <DaSistemareTable leads={computed} stages={settings.pipeline_stages} threshold={settings.followup_threshold_days} />
    </div>
  )
}
