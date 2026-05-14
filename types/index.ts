export type Lead = {
  id: string
  created_at: string
  nome: string | null
  cognome: string | null
  azienda: string | null
  email: string
  tel: string | null
  ruolo: string | null
  tipo: string | null
  richiesta: string | null
  origine: string | null
  industry: string | null
  dipendenti: number | null
  hanno_sito: boolean | null
  company_web: string | null
  esperienza_us: boolean | null
  stadio_pipeline: string  // kept as string: stages are user-configurable via settings table
  stato_lead: string | null
  stato: string | null
  motivo_lost: string | null
  valore: number | null
  owner: string | null
  data_apertura: string | null
  appuntamento: string | null
  ricontattare: string | null
  data_ultimo_contatto: string | null
  numero_messaggi: number
  risposto_ultima_mail: boolean
  touchpoints: number
  note: string | null
}

export type LeadWithComputed = Lead & {
  giorni_ultimo_contatto: number | null
  giorni_aperto: number | null
}

export type Interaction = {
  id: string
  lead_id: string
  created_at: string
  tipo: 'nota' | 'email' | 'chiamata' | 'meeting'
  contenuto: string
}

export type Settings = {
  followup_threshold_days: number
  pipeline_stages: string[]
}

export const DEFAULT_PIPELINE_STAGES = [
  'Nuovo',
  'Contattato',
  'In trattativa',
  'Proposta inviata',
  'Vinto',
  'Perso',
]

export const CLOSED_STAGES = ['Vinto', 'Perso']

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number)
  const d = new Date(year, month - 1, day)
  d.setHours(0, 0, 0, 0)
  return d
}

export function computeLeadFields(
  lead: Lead,
  referenceDate: Date = new Date()
): LeadWithComputed {
  const today = new Date(referenceDate)
  today.setHours(0, 0, 0, 0)

  const giorni_ultimo_contatto = lead.data_ultimo_contatto
    ? Math.floor((today.getTime() - parseLocalDate(lead.data_ultimo_contatto).getTime()) / 86400000)
    : null

  const giorni_aperto = lead.data_apertura
    ? Math.floor((today.getTime() - parseLocalDate(lead.data_apertura).getTime()) / 86400000)
    : null

  return { ...lead, giorni_ultimo_contatto, giorni_aperto }
}
