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

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes }
      else if (char === ',' && !inQuotes) { values.push(current); current = '' }
      else current += char
    }
    values.push(current)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (values[i] ?? '').trim().replace(/^"|"$/g, '') })
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
      appuntamento: (r['Appuntamento'] && r['Appuntamento'] !== 'Non effettuato') ? r['Appuntamento'] : null,
      valore: r['Valore'] ? parseFloat(r['Valore'].replace(',', '.')) || null : null,
      note: r['Note'] || null,
      owner: r['Owner'] || null,
      industry: r['Industry'] || null,
      esperienza_us: r['Esperienza US'] || null,
      dipendenti: r['Dipendenti'] ? parseInt(r['Dipendenti']) || null : null,
      company_web: r['Company Web'] || null,
    }))

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('leads')
    .upsert(leads, { onConflict: 'email', ignoreDuplicates: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, imported: leads.length })
}
