import type { Lead, LeadWithComputed } from '@/types'
import { computeLeadFields } from '@/types'

export const REF = new Date(2026, 6, 27) // lunedì 27 luglio 2026, mezzanotte locale

export const baseLead: Lead = {
  id: 'lead-1', created_at: '2026-01-01', email: 'a@b.it',
  nome: 'Mario', cognome: 'Rossi', azienda: 'ACME', tel: null, ruolo: null,
  tipo: null, richiesta: null, origine: null, industry: null,
  dipendenti: null, hanno_sito: null, company_web: null, esperienza_us: null,
  stadio_pipeline: 'Discovery', stato_lead: null, stato: null, motivo_lost: null,
  valore: null, owner: null, data_apertura: null, appuntamento: null, stato_appuntamento: 'Non schedulato',
  ricontattare: null, data_ultimo_contatto: null, data_chiusura: null,
  data_chiusura_prevista: null, contattato: false, numero_messaggi: 0,
  risposto_ultima_mail: false, touchpoints: 0, note: null,
}

export function makeLead(overrides: Partial<Lead> = {}): LeadWithComputed {
  return computeLeadFields({ ...baseLead, ...overrides }, REF)
}
