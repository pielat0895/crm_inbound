// scripts/import-sheet.ts
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

import { config } from 'dotenv'
config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const COLUMN_MAP: Record<string, string> = {
  'Data_apertura': 'data_apertura',
  'Nome': 'nome',
  'Cognome': 'cognome',
  'Azienda': 'azienda',
  'Email': 'email',
  'Tel': 'tel',
  'Tipo': 'tipo',
  'Richiesta': 'richiesta',
  'Origine': 'origine',
  'Stato Lead': 'stato_lead',
  'Stadio Pipeline': 'stadio_pipeline',
  'Stato': 'stato',
  'Motivo Lost': 'motivo_lost',
  'Valore': 'valore',
  'Owner': 'owner',
  'Ruolo': 'ruolo',
  'Esperienza US': 'esperienza_us',
  'Appuntamento': 'appuntamento',
  'Ricontattare': 'ricontattare',
  'Industry': 'industry',
  'Hanno sito': 'hanno_sito',
  'Company Web': 'company_web',
  'Dipendenti': 'dipendenti',
  'Note': 'note',
  'Numero messaggi': 'numero_messaggi',
  'Risposto Ultima Mail': 'risposto_ultima_mail',
  'Data Ultimo Contatto': 'data_ultimo_contatto',
  'Data di Chiusura': 'data_chiusura',
  'Contattato': 'contattato',
}

function parseCSV(content: string): Record<string, string>[] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const nextChar = content[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        currentCell += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        currentRow.push(currentCell)
        currentCell = ''
      } else if (char === '\n') {
        currentRow.push(currentCell)
        rows.push(currentRow)
        currentRow = []
        currentCell = ''
      } else if (char !== '\r') {
        currentCell += char
      }
    }
  }
  if (currentRow.length > 0 || currentCell !== '') {
    currentRow.push(currentCell)
    rows.push(currentRow)
  }

  const headers = rows[0].map(h => h.trim())
  return rows.slice(1)
    .filter(r => r.some(c => c.trim() !== ''))
    .map(row => {
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = (row[i] ?? '').trim() })
      return obj
    })
}

function coerce(key: string, value: string): unknown {
  if (!value || value === 'Invalid DateTime' || value === '#VALUE!' || value === '-') return null

  if (key === 'numero_messaggi') {
    const n = parseInt(value, 10)
    return isNaN(n) ? 0 : n
  }

  if (key === 'dipendenti') {
    const n = parseInt(value, 10)
    return isNaN(n) ? null : n
  }

  if (key === 'valore') {
    // Handle Italian format: "57.000,00 €" → 57000.00
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
    const n = parseFloat(cleaned)
    return isNaN(n) || n === 0 ? null : n
  }

  if (['hanno_sito', 'risposto_ultima_mail', 'contattato'].includes(key)) {
    const v = value.toLowerCase()
    if (v === 'sì' || v === 'si' || v === 'yes' || v === '1' || v === 'true') return true
    if (v === 'no' || v === 'false' || v === '0') return false
    return null
  }

  if (['data_apertura', 'data_ultimo_contatto', 'ricontattare', 'data_chiusura'].includes(key)) {
    // DD/MM/YYYY → YYYY-MM-DD
    const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
    return null
  }

  if (key === 'appuntamento') {
    // DD/MM/YYYY [HH:MM] → YYYY-MM-DD or YYYY-MM-DDTHH:MM
    const dateTime = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{2}:\d{2})$/)
    if (dateTime) return `${dateTime[3]}-${dateTime[2].padStart(2, '0')}-${dateTime[1].padStart(2, '0')}T${dateTime[4]}`
    const date = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (date) return `${date[3]}-${date[2].padStart(2, '0')}-${date[1].padStart(2, '0')}`
    return null
  }

  return value
}

async function main() {
  const csvPath = resolve(process.cwd(), 'scripts/leads-export.csv')
  const content = readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(content)

  console.log(`Parsed ${rows.length} rows`)

  let inserted = 0
  let skipped = 0

  for (const row of rows) {
    const payload: Record<string, unknown> = {}

    for (const [csvCol, dbCol] of Object.entries(COLUMN_MAP)) {
      if (row[csvCol] !== undefined) {
        payload[dbCol] = coerce(dbCol, row[csvCol])
      }
    }

    // Enforce NOT NULL defaults
    if (payload.numero_messaggi == null) payload.numero_messaggi = 0
    if (payload.risposto_ultima_mail == null) payload.risposto_ultima_mail = false
    if (payload.contattato == null) payload.contattato = false

    if (!payload.email) {
      console.log(`SKIP (no email): ${payload.nome} ${payload.cognome} — ${payload.azienda}`)
      skipped++
      continue
    }

    const { error } = await supabase
      .from('leads')
      .upsert(payload, { onConflict: 'email', ignoreDuplicates: false })

    if (error) {
      console.error(`ERROR: ${payload.email} — ${error.message}`)
      skipped++
    } else {
      console.log(`OK: ${payload.email}`)
      inserted++
    }
  }

  console.log(`\nDone. Inserted/updated: ${inserted}, Skipped: ${skipped}`)
}

main().catch(console.error)
