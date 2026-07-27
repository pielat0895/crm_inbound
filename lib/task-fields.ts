import { TASK_PRIORITIES } from '@/types'
import type { Task } from '@/types'

// Colonne scrivibili dal client. Escluse id, created_at, done_at (gestite dal server).
export const WRITABLE_TASK_FIELDS = [
  'titolo',
  'note',
  'due_date',
  'lead_id',
  'priorita',
  'done',
  'owner',
] as const satisfies readonly (keyof Task)[]

/** Filtra il body tenendo solo le colonne scrivibili (anti mass-assignment). */
export function pickTaskFields(body: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of WRITABLE_TASK_FIELDS) {
    if (body[field] !== undefined) result[field] = body[field]
  }
  return result
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Ritorna il messaggio d'errore, o null se il payload è valido. */
export function validateTaskInput(body: Record<string, unknown>): string | null {
  if (body.titolo !== undefined) {
    if (typeof body.titolo !== 'string' || body.titolo.trim() === '') return 'titolo obbligatorio'
  }
  if (body.priorita !== undefined && body.priorita !== null) {
    if (!TASK_PRIORITIES.includes(body.priorita as never)) return 'priorita non valida'
  }
  if (body.due_date !== undefined && body.due_date !== null) {
    if (typeof body.due_date !== 'string' || !ISO_DATE.test(body.due_date)) return 'due_date non valida'
  }
  return null
}
