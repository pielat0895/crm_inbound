import { ACTIVE_STAGE_EXCLUSIONS, parseLocalDate } from '@/types'
import type { LeadWithComputed } from '@/types'

/** Data locale in formato YYYY-MM-DD (no UTC: evita lo shift di fuso). */
export function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Somma giorni a una data YYYY-MM-DD, ritorna YYYY-MM-DD. */
export function addDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr)
  d.setDate(d.getDate() + days)
  return toDateString(d)
}

/** Un lead è "lavorabile": non chiuso, non già cliente/studente. */
export function isActiveLead(lead: LeadWithComputed): boolean {
  return !ACTIVE_STAGE_EXCLUSIONS.includes(lead.stadio_pipeline)
}

/**
 * Gli stadi "avanzati" = ultimo terzo degli stadi lavorabili configurati.
 * Gli stadi sono editabili da settings, quindi non possono essere hardcoded.
 */
export function advancedStages(pipelineStages: string[]): string[] {
  const active = pipelineStages.filter(s => !ACTIVE_STAGE_EXCLUSIONS.includes(s))
  if (active.length === 0) return []
  const count = Math.max(1, Math.ceil(active.length / 3))
  return active.slice(-count)
}
