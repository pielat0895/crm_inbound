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
  dipendenti: string | null
  hanno_sito: boolean | null
  company_web: string | null
  esperienza_us: string | null
  stadio_pipeline: string  // kept as string: stages are user-configurable via settings table
  stato_lead: string | null
  stato: string | null
  motivo_lost: string | null
  valore: number | null
  owner: string | null
  data_apertura: string | null
  appuntamento: string | null
  stato_appuntamento: string
  ricontattare: string | null
  data_ultimo_contatto: string | null
  data_chiusura: string | null
  data_chiusura_prevista: string | null
  contattato: boolean
  numero_messaggi: number
  risposto_ultima_mail: boolean
  touchpoints: number
  note: string | null
}

export type LeadWithComputed = Lead & {
  giorni_ultimo_contatto: number | null
  giorni_aperto: number | null
  giorni_pipeline: number | null
}

export type Interaction = {
  id: string
  lead_id: string
  created_at: string
  tipo: 'nota' | 'email' | 'chiamata' | 'meeting' | 'ai_analisi'
  contenuto: string
}

export type TaskPriority = 'alta' | 'media' | 'bassa'

export type Task = {
  id: string
  created_at: string
  titolo: string
  note: string | null
  due_date: string | null
  lead_id: string | null
  priorita: TaskPriority
  done: boolean
  done_at: string | null
  owner: string | null
}

export const TASK_PRIORITIES: TaskPriority[] = ['alta', 'media', 'bassa']

export type Settings = {
  followup_threshold_days: number
  pipeline_stages: string[]
  pipeline_stage_probabilities: Record<string, number>
}

// Stadio: posizione nel funnel prima della chiusura. Nessuno stato terminale
// qui: l'esito (vinto/perso/cliente/...) vive in `stato`. Quando `stato`
// diventa terminale, `stadio_pipeline` resta congelato all'ultimo valore
// raggiunto (dice fin dove è arrivato il lead prima di fermarsi).
export const DEFAULT_PIPELINE_STAGES = [
  'Lead In',
  'Discovery',
  'Proposal Sent',
  'Proposal Signed',
]

// Stato: esito/stato dettagliato del lead. Guida le metriche
// won/lost/attivo/dormiente — è l'unico campo che la logica di business legge.
export const STATO_OPTIONS = [
  'In corso',
  'In chiusura',
  'Rimandato',
  'Vinto',
  'Perso',
  'Cliente',
  'Non qualificato',
  'Studente',
]

// Valori terminali di `stato`: il lead non è più lavorabile.
export const STATO_TERMINALI = ['Vinto', 'Perso', 'Cliente', 'Non qualificato', 'Studente']

export const DIPENDENTI_OPTIONS = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1001-5000',
  '5001-10000',
  '10000+',
  'Studente',
  'Autonomo',
]

export const ORIGINE_OPTIONS = [
  'Info',
  'LeadChampion',
  'Sito (Lead Champion)',
  'Lead Generation',
  'Landing Page',
  'Support',
  'Promo Real Estate',
  'Clienti',
  'Eventi',
]

export const INDUSTRY_OPTIONS = [
  'Retail, Consumer Goods, Fashion',
  'Manufacturing & Industrial',
  'Health, Beauty & Wellness',
  'Business & Professional Services',
  'Marketing, Media & Communication',
  'Education & Institutional',
  'Restaurants & Food',
  'Real Estate',
  'Studente',
]

export const STATO_LEAD_OPTIONS = ['Attivo', 'In Attesa', 'Chiuso', 'Cliente']

// Stato appuntamento: esito dell'appuntamento, indipendente dalla data/ora
// del campo `appuntamento` — sempre una scelta manuale, nessuna deduzione
// automatica dalla presenza o dal valore di quel campo.
export const STATO_APPUNTAMENTO_OPTIONS = ['Non schedulato', 'Schedulato', 'Effettuato', 'Non presentato']
export const STATO_APPUNTAMENTO_DEFAULT = STATO_APPUNTAMENTO_OPTIONS[0]

export const ESPERIENZA_US_OPTIONS = [
  'Web (sito)',
  'Lead Gen',
  'Passaparola',
  'Già Cliente',
  'Social / Eventi',
  'Linkedin - Monitora',
  'Linkedin - Ugeo Batch 2',
  'Telefono ufficio',
  'Studente/Università',
]

export function parseLocalDate(dateStr: string): Date {
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

  const giorni_pipeline = lead.data_apertura && lead.data_chiusura
    ? Math.floor((parseLocalDate(lead.data_chiusura).getTime() - parseLocalDate(lead.data_apertura).getTime()) / 86400000)
    : null

  return { ...lead, giorni_ultimo_contatto, giorni_aperto, giorni_pipeline }
}
