import { STATO_TERMINALI, parseLocalDate } from '@/types'
import type { LeadWithComputed, Task, TaskPriority, Settings } from '@/types'

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

/** Un lead è "lavorabile": stato non ancora terminale (null = non ancora chiuso). */
export function isActiveLead(lead: LeadWithComputed): boolean {
  return !STATO_TERMINALI.includes(lead.stato ?? '')
}

/**
 * Gli stadi "avanzati" = ultimo terzo degli stadi pipeline configurati.
 * Gli stadi sono editabili da settings, quindi non possono essere hardcoded.
 */
export function advancedStages(pipelineStages: string[]): string[] {
  if (pipelineStages.length === 0) return []
  const count = Math.max(1, Math.ceil(pipelineStages.length / 3))
  return pipelineStages.slice(-count)
}

export type FeedItemKind = 'task' | 'ricontatto' | 'appuntamento' | 'dormiente'

export type FeedItem = {
  key: string
  kind: FeedItemKind
  titolo: string
  date: string | null
  priorita: TaskPriority | null
  taskId: string | null
  leadId: string | null
  leadLabel: string | null
  valore: number | null
  closingSoon: boolean
  giorniSilenzio: number | null
  /** Solo per i dormienti: il lead non è mai stato contattato. */
  maiContattato?: boolean
}

/** "Mario Rossi · ACME", saltando i pezzi mancanti. */
export function leadLabel(lead: LeadWithComputed): string {
  const persona = [lead.nome, lead.cognome].filter(Boolean).join(' ')
  return [persona, lead.azienda].filter(Boolean).join(' · ') || lead.email
}

const PRIORITY_RANK: Record<TaskPriority, number> = { alta: 0, media: 1, bassa: 2 }

function byDateThenPriority(a: FeedItem, b: FeedItem): number {
  const da = a.date ?? '9999-12-31'
  const db = b.date ?? '9999-12-31'
  if (da !== db) return da < db ? -1 : 1
  return PRIORITY_RANK[a.priorita ?? 'media'] - PRIORITY_RANK[b.priorita ?? 'media']
}

function taskItem(task: Task, lead: LeadWithComputed | undefined, closingLeadIds: Set<string>): FeedItem {
  return {
    key: `task:${task.id}`,
    kind: 'task',
    titolo: task.titolo,
    date: task.due_date,
    priorita: task.priorita,
    taskId: task.id,
    leadId: task.lead_id,
    leadLabel: lead ? leadLabel(lead) : null,
    valore: lead?.valore ?? null,
    closingSoon: task.lead_id ? closingLeadIds.has(task.lead_id) : false,
    giorniSilenzio: lead?.giorni_ultimo_contatto ?? null,
  }
}

/**
 * Sezione "Da fare ora": task scaduti o in scadenza oggi, ricontatti dovuti,
 * appuntamenti di oggi. `used` accumula i lead già consumati da item derivati,
 * così le sezioni successive non li ripetono.
 */
export function buildDaFareOra(
  leads: LeadWithComputed[],
  tasks: Task[],
  now: Date,
  closingLeadIds: Set<string>,
  used: Set<string>,
): FeedItem[] {
  const today = toDateString(now)
  const leadById = new Map(leads.map(l => [l.id, l]))
  const items: FeedItem[] = []

  for (const task of tasks) {
    if (!task.due_date || task.due_date > today) continue
    items.push(taskItem(task, task.lead_id ? leadById.get(task.lead_id) : undefined, closingLeadIds))
    if (task.lead_id) used.add(task.lead_id)
  }

  for (const lead of leads) {
    if (!isActiveLead(lead) || used.has(lead.id)) continue

    if (lead.ricontattare && lead.ricontattare <= today) {
      items.push({
        key: `ricontatto:${lead.id}`,
        kind: 'ricontatto',
        titolo: `Ricontattare ${leadLabel(lead)}`,
        date: lead.ricontattare,
        priorita: null,
        taskId: null,
        leadId: lead.id,
        leadLabel: leadLabel(lead),
        valore: lead.valore,
        closingSoon: closingLeadIds.has(lead.id),
        giorniSilenzio: lead.giorni_ultimo_contatto,
      })
      used.add(lead.id)
      continue
    }

    if (lead.appuntamento && lead.appuntamento.slice(0, 10) === today) {
      items.push({
        key: `appuntamento:${lead.id}`,
        kind: 'appuntamento',
        titolo: `Appuntamento · ${leadLabel(lead)}`,
        date: today,
        priorita: null,
        taskId: null,
        leadId: lead.id,
        leadLabel: leadLabel(lead),
        valore: lead.valore,
        closingSoon: closingLeadIds.has(lead.id),
        giorniSilenzio: lead.giorni_ultimo_contatto,
      })
      used.add(lead.id)
    }
  }

  return items.sort(byDateThenPriority)
}

export type ClosingItem = {
  leadId: string
  leadLabel: string
  valore: number | null
  stadio: string
  dataPrevista: string | null
  stimato: boolean
  giorniUltimoContatto: number | null
}

/** True se il lead è candidato a chiudersi: data prevista in finestra, o stadio avanzato ancora caldo. */
export function isClosingSoon(
  lead: LeadWithComputed,
  now: Date,
  closingDays: number,
  pipelineStages: string[],
  followupThresholdDays: number,
): boolean {
  if (!isActiveLead(lead)) return false
  const today = toDateString(now)
  const limit = addDays(today, closingDays)

  if (lead.data_chiusura_prevista) {
    return lead.data_chiusura_prevista <= limit
  }

  if (!advancedStages(pipelineStages).includes(lead.stadio_pipeline)) return false
  return lead.giorni_ultimo_contatto !== null && lead.giorni_ultimo_contatto < followupThresholdDays
}

/** Sezione "Prossimi a chiusura": card di rischio, non checkbox. */
export function buildProssimiChiusura(
  leads: LeadWithComputed[],
  now: Date,
  closingDays: number,
  pipelineStages: string[],
  followupThresholdDays: number,
  used: Set<string>,
): ClosingItem[] {
  const items: ClosingItem[] = []

  for (const lead of leads) {
    if (used.has(lead.id)) continue
    if (!isClosingSoon(lead, now, closingDays, pipelineStages, followupThresholdDays)) continue

    items.push({
      leadId: lead.id,
      leadLabel: leadLabel(lead),
      valore: lead.valore,
      stadio: lead.stadio_pipeline,
      dataPrevista: lead.data_chiusura_prevista,
      stimato: !lead.data_chiusura_prevista,
      giorniUltimoContatto: lead.giorni_ultimo_contatto,
    })
    used.add(lead.id)
  }

  return items.sort((a, b) => {
    if (a.stimato !== b.stimato) return a.stimato ? 1 : -1
    if (!a.stimato && !b.stimato) {
      return (a.dataPrevista ?? '') < (b.dataPrevista ?? '') ? -1 : 1
    }
    return (b.valore ?? 0) - (a.valore ?? 0)
  })
}

/**
 * Da quanti giorni il lead è fermo. Se non è mai stato contattato il conteggio
 * parte dalla data di apertura (o dalla creazione): un lead entrato due mesi fa
 * e mai lavorato è fermo da due mesi, non "senza dati".
 */
export function giorniFermo(
  lead: LeadWithComputed,
  now: Date,
): { giorni: number | null; riferimento: string | null; maiContattato: boolean } {
  if (lead.giorni_ultimo_contatto !== null) {
    return { giorni: lead.giorni_ultimo_contatto, riferimento: lead.data_ultimo_contatto, maiContattato: false }
  }

  const riferimento = lead.data_apertura ?? lead.created_at?.slice(0, 10) ?? null
  if (!riferimento) return { giorni: null, riferimento: null, maiContattato: true }

  const today = parseLocalDate(toDateString(now))
  const giorni = Math.floor((today.getTime() - parseLocalDate(riferimento).getTime()) / 86400000)
  return { giorni, riferimento, maiContattato: true }
}

export type LeadARischio = { lead: LeadWithComputed; giorni: number; maiContattato: boolean }

/**
 * Lead attivi fermi da almeno thresholdDays giorni, incluso chi non è mai
 * stato contattato (fermo dalla data apertura, non invisibile per mancanza
 * di giorni_ultimo_contatto — stessa logica di giorniFermo).
 */
export function leadARischio(
  leads: LeadWithComputed[],
  now: Date,
  thresholdDays: number,
): LeadARischio[] {
  const result: LeadARischio[] = []
  for (const lead of leads) {
    // stato_lead è indipendente da stato (esito): un lead può restare "attivo"
    // per isActiveLead ma essere già marcato Chiuso a mano — niente follow-up.
    if (!isActiveLead(lead) || lead.stato_lead === 'Chiuso') continue
    const { giorni, maiContattato } = giorniFermo(lead, now)
    if (giorni !== null && giorni >= thresholdDays) {
      result.push({ lead, giorni, maiContattato })
    }
  }
  return result.sort((a, b) => b.giorni - a.giorni)
}

/** Sezione "Dormienti": lead fermi da troppo tempo e senza nulla di pianificato. */
export function buildDormienti(
  leads: LeadWithComputed[],
  tasks: Task[],
  now: Date,
  dormantDays: number,
  closingLeadIds: Set<string>,
  used: Set<string>,
): FeedItem[] {
  const today = toDateString(now)
  const leadsWithOpenTask = new Set(tasks.filter(t => t.lead_id).map(t => t.lead_id!))
  const items: FeedItem[] = []

  for (const lead of leads) {
    if (!isActiveLead(lead) || used.has(lead.id)) continue
    if (leadsWithOpenTask.has(lead.id)) continue
    if (lead.ricontattare && lead.ricontattare > today) continue

    const fermo = giorniFermo(lead, now)
    if (fermo.giorni === null || fermo.giorni < dormantDays) continue

    items.push({
      key: `dormiente:${lead.id}`,
      kind: 'dormiente',
      titolo: leadLabel(lead),
      date: fermo.riferimento,
      priorita: null,
      taskId: null,
      leadId: lead.id,
      leadLabel: leadLabel(lead),
      valore: lead.valore,
      closingSoon: closingLeadIds.has(lead.id),
      giorniSilenzio: fermo.giorni,
      maiContattato: fermo.maiContattato,
    })
    used.add(lead.id)
  }

  return items.sort((a, b) => (b.giorniSilenzio ?? 0) - (a.giorniSilenzio ?? 0))
}

/**
 * Sezione "In arrivo": task e scadenze nella finestra (oggi, oggi+upcomingDays].
 * I task senza due_date finiscono in coda (byDateThenPriority li ordina per ultimo).
 */
export function buildInArrivo(
  leads: LeadWithComputed[],
  tasks: Task[],
  now: Date,
  upcomingDays: number,
  closingLeadIds: Set<string>,
  used: Set<string>,
): FeedItem[] {
  const today = toDateString(now)
  const limit = addDays(today, upcomingDays)
  const leadById = new Map(leads.map(l => [l.id, l]))
  const items: FeedItem[] = []

  for (const task of tasks) {
    const inWindow = task.due_date && task.due_date > today && task.due_date <= limit
    if (!inWindow && task.due_date !== null) continue
    items.push(taskItem(task, task.lead_id ? leadById.get(task.lead_id) : undefined, closingLeadIds))
    if (task.lead_id) used.add(task.lead_id)
  }

  for (const lead of leads) {
    if (!isActiveLead(lead) || used.has(lead.id)) continue

    if (lead.ricontattare && lead.ricontattare > today && lead.ricontattare <= limit) {
      items.push({
        key: `ricontatto:${lead.id}`,
        kind: 'ricontatto',
        titolo: `Ricontattare ${leadLabel(lead)}`,
        date: lead.ricontattare,
        priorita: null,
        taskId: null,
        leadId: lead.id,
        leadLabel: leadLabel(lead),
        valore: lead.valore,
        closingSoon: closingLeadIds.has(lead.id),
        giorniSilenzio: lead.giorni_ultimo_contatto,
      })
      used.add(lead.id)
      continue
    }

    const appDate = lead.appuntamento?.slice(0, 10)
    if (appDate && appDate > today && appDate <= limit) {
      items.push({
        key: `appuntamento:${lead.id}`,
        kind: 'appuntamento',
        titolo: `Appuntamento · ${leadLabel(lead)}`,
        date: appDate,
        priorita: null,
        taskId: null,
        leadId: lead.id,
        leadLabel: leadLabel(lead),
        valore: lead.valore,
        closingSoon: closingLeadIds.has(lead.id),
        giorniSilenzio: lead.giorni_ultimo_contatto,
      })
      used.add(lead.id)
    }
  }

  return items.sort(byDateThenPriority)
}

export type TaskFeedFilters = {
  upcomingDays: number
  closingDays: number
  dormantDays: number
  owner: string | null
}

export type TaskFeed = {
  daFareOra: FeedItem[]
  inArrivo: FeedItem[]
  prossimiChiusura: ClosingItem[]
  dormienti: FeedItem[]
}

/**
 * Compone le quattro sezioni. Un lead compare in una sola sezione: `used` è
 * condiviso e la precedenza è l'ordine di chiamata
 * (da fare ora > in arrivo > prossimi a chiusura > dormienti).
 * Eccezione voluta: più task manuali sullo stesso lead restano righe distinte.
 */
export function buildTaskFeed(
  allLeads: LeadWithComputed[],
  allTasks: Task[],
  settings: Settings,
  filters: TaskFeedFilters,
  now: Date = new Date(),
): TaskFeed {
  const leads = allLeads.filter(l => !filters.owner || l.owner === filters.owner)
  const tasks = allTasks.filter(t => !t.done && (!filters.owner || t.owner === filters.owner))

  // Precalcolato: serve come badge nelle sezioni che precedono "prossimi a chiusura".
  const closingLeadIds = new Set(
    leads
      .filter(l => isClosingSoon(l, now, filters.closingDays, settings.pipeline_stages, settings.followup_threshold_days))
      .map(l => l.id)
  )

  const used = new Set<string>()

  return {
    daFareOra: buildDaFareOra(leads, tasks, now, closingLeadIds, used),
    inArrivo: buildInArrivo(leads, tasks, now, filters.upcomingDays, closingLeadIds, used),
    prossimiChiusura: buildProssimiChiusura(
      leads, now, filters.closingDays, settings.pipeline_stages, settings.followup_threshold_days, used,
    ),
    dormienti: buildDormienti(leads, tasks, now, filters.dormantDays, closingLeadIds, used),
  }
}
