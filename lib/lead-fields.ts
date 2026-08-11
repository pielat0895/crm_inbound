import type { Lead } from '@/types'

// Colonne scrivibili dal client. Esclude id e created_at (gestite dal DB).
export const WRITABLE_LEAD_FIELDS = [
  'nome',
  'cognome',
  'azienda',
  'email',
  'tel',
  'ruolo',
  'tipo',
  'richiesta',
  'origine',
  'industry',
  'dipendenti',
  'hanno_sito',
  'company_web',
  'esperienza_us',
  'stadio_pipeline',
  'stato_lead',
  'stato',
  'motivo_lost',
  'valore',
  'owner',
  'data_apertura',
  'appuntamento',
  'stato_appuntamento',
  'ricontattare',
  'data_ultimo_contatto',
  'data_chiusura',
  'data_chiusura_prevista',
  'contattato',
  'numero_messaggi',
  'risposto_ultima_mail',
  'touchpoints',
  'note',
] as const satisfies readonly (keyof Lead)[]

// Filtra il body tenendo solo le colonne scrivibili (anti mass-assignment).
export function pickLeadFields(body: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of WRITABLE_LEAD_FIELDS) {
    if (body[field] !== undefined) result[field] = body[field]
  }
  return result
}
