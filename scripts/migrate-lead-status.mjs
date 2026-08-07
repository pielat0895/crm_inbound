// scripts/migrate-lead-status.mjs
//
// One-off migration: maps the old mixed stadio_pipeline vocabulary to the
// new split stato/stadio_pipeline fields (see docs/superpowers/specs/
// 2026-08-06-lead-status-fields-redesign-design.md).
//
// Usage:
//   node scripts/migrate-lead-status.mjs            # dry run, no writes
//   node scripts/migrate-lead-status.mjs --apply     # writes to the DB
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Old stadio_pipeline value → new stato, when it represented a terminal outcome.
const STADIO_TO_STATO = {
  'Chiuso (Vinto)': 'Vinto',
  'Vinto': 'Vinto',
  'Chiuso (Perso)': 'Perso',
  'Perso': 'Perso',
  'Cliente': 'Cliente',
  'Studente': 'Studente',
}

// Old stadio_pipeline value → new stadio_pipeline, when it was clearly non-terminal.
const STADIO_TO_NEW_STADIO = {
  'Lead In': 'Lead In',
  'Nuovo': 'Lead In',
  'Discovery': 'Discovery',
  'Contattato': 'Discovery',
  'In trattativa': 'Discovery',
  'Proposal Sent': 'Proposal Sent',
  'Proposta inviata': 'Proposal Sent',
}

const KNOWN_OLD_VALUES = new Set([
  ...Object.keys(STADIO_TO_STATO),
  ...Object.keys(STADIO_TO_NEW_STADIO),
])

function planRow(lead) {
  const old = lead.stadio_pipeline
  const isTerminalOld = old in STADIO_TO_STATO
  const stato = STADIO_TO_STATO[old] ?? 'In corso'
  // For a lead that was already terminal in the old vocabulary, we have no
  // record of how far it got in the funnel before closing — 'Proposal Sent'
  // is a guess, flagged for manual review rather than applied silently.
  const newStadio = STADIO_TO_NEW_STADIO[old] ?? 'Proposal Sent'
  const needsReview = !KNOWN_OLD_VALUES.has(old) || isTerminalOld

  return { id: lead.id, email: lead.email, oldStadio: old, newStato: stato, newStadio, needsReview }
}

async function main() {
  const apply = process.argv.includes('--apply')

  const { data: leads, error } = await supabase.from('leads').select('id, email, stadio_pipeline')
  if (error) throw error

  const plans = leads.map(planRow)
  const toReview = plans.filter(p => p.needsReview)
  const clean = plans.filter(p => !p.needsReview)

  console.log(`Totale lead: ${plans.length}`)
  console.log(`Da rivedere manualmente (stadio_pipeline è una stima): ${toReview.length}`)
  console.log(`Mappatura diretta: ${clean.length}\n`)

  console.log('--- Righe da rivedere (esito terminale, stadio_pipeline stimato) ---')
  for (const p of toReview) {
    console.log(`${(p.email ?? p.id).padEnd(35)} "${p.oldStadio}" -> stato="${p.newStato}", stadio_pipeline="${p.newStadio}" (stima)`)
  }

  console.log('\n--- Righe con mappatura diretta ---')
  for (const p of clean) {
    console.log(`${(p.email ?? p.id).padEnd(35)} "${p.oldStadio}" -> stato="${p.newStato}", stadio_pipeline="${p.newStadio}"`)
  }

  if (!apply) {
    console.log('\nDRY RUN — nessuna scrittura eseguita. Rilancia con --apply per applicare.')
    return
  }

  console.log('\nApplico le modifiche...')
  let ok = 0
  let failed = 0
  for (const p of plans) {
    const { error: updateError } = await supabase
      .from('leads')
      .update({ stato: p.newStato, stadio_pipeline: p.newStadio })
      .eq('id', p.id)
    if (updateError) {
      console.error(`ERRORE ${p.email}: ${updateError.message}`)
      failed++
    } else {
      ok++
    }
  }
  console.log(`\nFatto. Aggiornati: ${ok}, falliti: ${failed}`)
}

main().catch(console.error)
