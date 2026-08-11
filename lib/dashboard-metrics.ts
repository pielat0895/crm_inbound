import type { LeadWithComputed } from '@/types'

/** Percentuale arrotondata, 0 se il denominatore è 0 (mai NaN). */
export function percent(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0
}

/** Win rate tra i soli lead con esito Vinto/Perso — ignora gli altri stati terminali. */
export function winRateVintoPerso(
  leads: LeadWithComputed[],
): { vinti: number; persi: number; rate: number } {
  const vinti = leads.filter(l => l.stato === 'Vinto').length
  const persi = leads.filter(l => l.stato === 'Perso').length
  return { vinti, persi, rate: percent(vinti, vinti + persi) }
}

/** Somma valore pesata per la probabilità di chiusura del rispettivo stadio (0% se non configurata). */
export function weightedForecast(
  openLeads: LeadWithComputed[],
  probabilities: Record<string, number>,
): number {
  return openLeads.reduce(
    (sum, l) => sum + (l.valore ?? 0) * ((probabilities[l.stadio_pipeline] ?? 0) / 100),
    0,
  )
}

export type PerformanceRow = { key: string; totale: number; vinti: number; tasso: number }

/** Raggruppa per keyFn (null -> "N/D") e calcola tasso di vittoria per gruppo. */
export function performanceByKey(
  cohortLeads: LeadWithComputed[],
  keyFn: (lead: LeadWithComputed) => string | null,
): PerformanceRow[] {
  const groups = new Map<string, LeadWithComputed[]>()
  for (const lead of cohortLeads) {
    const key = keyFn(lead) ?? 'N/D'
    const group = groups.get(key) ?? []
    group.push(lead)
    groups.set(key, group)
  }
  return Array.from(groups.entries()).map(([key, group]) => {
    const vinti = group.filter(l => l.stato === 'Vinto').length
    return { key, totale: group.length, vinti, tasso: percent(vinti, group.length) }
  })
}

/** Conteggio per ciascuno stato terminale, nell'ordine passato. */
export function distribuzioneEsiti(
  closedCohortLeads: LeadWithComputed[],
  statoTerminali: string[],
): { stato: string; count: number }[] {
  return statoTerminali.map(stato => ({
    stato,
    count: closedCohortLeads.filter(l => l.stato === stato).length,
  }))
}

/** Tra i lead chiusi (Vinto/Perso) che hanno fatto l'appuntamento, quota Vinto. */
export function schedulingToCloseRate(
  closedDecisiveLeads: LeadWithComputed[],
): { vinti: number; totale: number; rate: number } {
  const effettuati = closedDecisiveLeads.filter(l => l.stato_appuntamento === 'Effettuato')
  const vinti = effettuati.filter(l => l.stato === 'Vinto').length
  return { vinti, totale: effettuati.length, rate: percent(vinti, effettuati.length) }
}
