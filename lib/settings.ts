import { createServiceClient } from '@/lib/supabase/server'
import type { Settings } from '@/types'

export async function getSettings(): Promise<Settings> {
  const supabase = createServiceClient()
  const { data } = await supabase.from('settings').select('key, value')

  const map: Record<string, string> = {}
  for (const row of data ?? []) map[row.key] = row.value

  return {
    followup_threshold_days: parseInt(map['followup_threshold_days'] ?? '7', 10),
    pipeline_stages: JSON.parse(map['pipeline_stages'] ?? '["Lead In","Discovery","Proposal Sent","Proposal Signed"]'),
    pipeline_stage_probabilities: JSON.parse(map['pipeline_stage_probabilities'] ?? '{}'),
  }
}

export async function updateSetting(key: string, value: string): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })
}
