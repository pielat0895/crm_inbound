import { NextRequest, NextResponse } from 'next/server'
import { getSettings, updateSetting } from '@/lib/settings'

export async function GET() {
  const settings = await getSettings()
  return NextResponse.json(settings)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()

  if (body.followup_threshold_days !== undefined) {
    const val = parseInt(body.followup_threshold_days, 10)
    if (isNaN(val) || val < 1) {
      return NextResponse.json({ error: 'Invalid threshold' }, { status: 400 })
    }
    await updateSetting('followup_threshold_days', String(val))
  }

  if (body.pipeline_stages !== undefined) {
    if (!Array.isArray(body.pipeline_stages)) {
      return NextResponse.json({ error: 'pipeline_stages must be array' }, { status: 400 })
    }
    await updateSetting('pipeline_stages', JSON.stringify(body.pipeline_stages))
  }

  if (body.pipeline_stage_probabilities !== undefined) {
    const probs = body.pipeline_stage_probabilities
    if (typeof probs !== 'object' || probs === null || Array.isArray(probs)) {
      return NextResponse.json({ error: 'pipeline_stage_probabilities must be an object' }, { status: 400 })
    }
    for (const [stage, value] of Object.entries(probs)) {
      if (typeof value !== 'number' || isNaN(value) || value < 0 || value > 100) {
        return NextResponse.json({ error: `Invalid probability for stage "${stage}"` }, { status: 400 })
      }
    }
    await updateSetting('pipeline_stage_probabilities', JSON.stringify(probs))
  }

  const settings = await getSettings()
  return NextResponse.json(settings)
}
