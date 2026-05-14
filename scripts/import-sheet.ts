// scripts/import-sheet.ts
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually
import { config } from 'dotenv'
config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Map CSV column headers → DB field names
// Update keys to match your exact Google Sheet column headers
const COLUMN_MAP: Record<string, string> = {
  'Data apertura': 'data_apertura',
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
  'Touchpoints': 'touchpoints',
  'Numero messaggi': 'numero_messaggi',
  'Risposto Ultima Mail': 'risposto_ultima_mail',
  'Data Ultimo Contatto': 'data_ultimo_contatto',
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(l => l.trim())
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
  return lines.slice(1).map(line => {
    const values = line.match(/("([^"]*)")|([^,]+)|(?<=,)(?=,|$)/g) ?? []
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? '').replace(/^"|"$/g, '').trim()
    })
    return row
  })
}

function coerce(key: string, value: string): unknown {
  if (value === '' || value === undefined) return null
  if (['dipendenti', 'touchpoints', 'numero_messaggi'].includes(key)) return parseInt(value, 10) || null
  if (key === 'valore') return parseFloat(value.replace(',', '.')) || null
  if (['hanno_sito', 'esperienza_us', 'risposto_ultima_mail'].includes(key)) {
    return value.toLowerCase() === 'sì' || value.toLowerCase() === 'yes' || value === '1' || value.toLowerCase() === 'true'
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
      inserted++
    }
  }

  console.log(`\nDone. Inserted/updated: ${inserted}, Skipped: ${skipped}`)
}

main().catch(console.error)
