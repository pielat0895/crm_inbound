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

  const settings = await getSettings()
  return NextResponse.json(settings)
}
