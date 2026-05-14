import { getSettings } from '@/lib/settings'
import { LeadForm } from '@/components/leads/LeadForm'

export default async function NewLeadPage() {
  const settings = await getSettings()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nuovo lead</h1>
      <LeadForm stages={settings.pipeline_stages} />
    </div>
  )
}
