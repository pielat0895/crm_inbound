import { describe, it, expect } from 'vitest'
import { STAGE_BADGE_CLASSES, STAGE_CHART_COLORS, STATO_BADGE_CLASSES, STATO_APPUNTAMENTO_BADGE_CLASSES, STATO_APPUNTAMENTO_CHART_COLORS } from './stage-colors'
import { DEFAULT_PIPELINE_STAGES, STATO_OPTIONS, STATO_APPUNTAMENTO_OPTIONS } from '@/types'

describe('stage-colors parity', () => {
  it('STAGE_BADGE_CLASSES has exactly the DEFAULT_PIPELINE_STAGES keys', () => {
    expect(Object.keys(STAGE_BADGE_CLASSES).sort()).toEqual([...DEFAULT_PIPELINE_STAGES].sort())
  })

  it('STAGE_CHART_COLORS has exactly the DEFAULT_PIPELINE_STAGES keys', () => {
    expect(Object.keys(STAGE_CHART_COLORS).sort()).toEqual([...DEFAULT_PIPELINE_STAGES].sort())
  })

  it('STATO_BADGE_CLASSES has exactly the STATO_OPTIONS keys', () => {
    expect(Object.keys(STATO_BADGE_CLASSES).sort()).toEqual([...STATO_OPTIONS].sort())
  })

  it('STATO_APPUNTAMENTO_BADGE_CLASSES has exactly the STATO_APPUNTAMENTO_OPTIONS keys', () => {
    expect(Object.keys(STATO_APPUNTAMENTO_BADGE_CLASSES).sort()).toEqual([...STATO_APPUNTAMENTO_OPTIONS].sort())
  })

  it('STATO_APPUNTAMENTO_CHART_COLORS has exactly the STATO_APPUNTAMENTO_OPTIONS keys', () => {
    expect(Object.keys(STATO_APPUNTAMENTO_CHART_COLORS).sort()).toEqual([...STATO_APPUNTAMENTO_OPTIONS].sort())
  })
})
