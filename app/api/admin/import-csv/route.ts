import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function toISO(s: string | undefined): string | null {
  if (!s || s.trim() === '') return null
  const [d, m, y] = s.trim().split('/')
  if (!d || !m || !y) return null
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function toBool(s: string | undefined): boolean | null {
  if (s === undefined || s === null || s === '') return null
  const v = s.trim().toLowerCase()
  if (v === 'no') return false
  if (['sì', 'si', 'yes', 'true', '1'].includes(v)) return true
  return null
}

// Parses Italian currency format: "57.000,00 €" → 57000
function parseValore(s: string | undefined): number | null {
  if (!s || s.trim() === '') return null
  const cleaned = s.replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

// Handles quoted fields with embedded newlines (RFC 4180 compliant)
function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        current.push(field.trim())
        field = ''
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        if (ch === '\r') i++
        current.push(field.trim())
        field = ''
        if (current.some(f => f !== '')) rows.push(current)
        current = []
      } else {
        field += ch
      }
    }
  }
  if (field || current.length) { current.push(field.trim()); if (current.some(f => f !== '')) rows.push(current) }

  if (rows.length < 2) return []
  const headers = rows[0].map(h => h.replace(/^"|"$/g, ''))
  return rows.slice(1).map(values => {
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (values[i] ?? '').replace(/^"|"$/g, '') })
    return row
  })
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File CSV mancante' }, { status: 400 })

  const text = await file.text()
  const rows = parseCSV(text)
  if (rows.length === 0) return NextResponse.json({ error: 'CSV vuoto o non valido' }, { status: 400 })

  const leads = rows
    .filter(r => r['Email'] && r['Email'].trim() !== '')
    .map(r => ({
      email: r['Email'].trim().toLowerCase(),
      nome: r['Nome'] || null,
      cognome: r['Cognome'] || null,
      azienda: r['Azienda'] || null,
      ruolo: r['Ruolo'] || null,
      tel: r['Tel'] || null,
      tipo: r['Tipo'] || null,
      richiesta: r['Richiesta'] || null,
      origine: r['Origine'] || null,
      stato_lead: r['Stato Lead'] || null,
      stato: r['Stato'] || null,
      stadio_pipeline: r['Stadio Pipeline'] || 'Lead In',
      motivo_lost: (r['Motivo Lost'] && r['Motivo Lost'] !== 'Nessuno') ? r['Motivo Lost'] : null,
      contattato: toBool(r['Contattato']) ?? false,
      data_chiusura: toISO(r['Data di Chiusura']),
      data_ultimo_contatto: toISO(r['Data Ultimo Contatto']),
      data_apertura: toISO(r['Data_apertura']),
      appuntamento: null,
      valore: parseValore(r['Valore']),
      note: r['Note'] || null,
      owner: r['Owner'] || null,
      industry: r['Industry'] || null,
      esperienza_us: r['Esperienza US'] || null,
      dipendenti: r['Dipendenti'] ? parseInt(r['Dipendenti']) || null : null,
      company_web: r['Company Web'] || null,
      hanno_sito: toBool(r['Hanno sito']),
      numero_messaggi: r['Numero messaggi'] ? parseInt(r['Numero messaggi']) || 0 : 0,
      risposto_ultima_mail: toBool(r['Risposto Ultima Mail']) ?? false,
      touchpoints: 0,
    }))

  // Deduplica per email: tieni l'ultima occorrenza (più recente nel CSV)
  const deduped = Object.values(
    leads.reduce<Record<string, typeof leads[0]>>((acc, l) => { acc[l.email] = l; return acc }, {})
  )

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('leads')
    .upsert(deduped, { onConflict: 'email', ignoreDuplicates: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, imported: leads.length })
}
