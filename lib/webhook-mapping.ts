function validateSecret(request: Request): boolean {
  const secret = request.headers.get('x-webhook-secret')
  return secret === process.env.WEBHOOK_SECRET
}

const INBOUND_FIELD_MAP: Record<string, string> = {
  nome: 'nome',
  cognome: 'cognome',
  azienda: 'azienda',
  email: 'email',
  tel: 'tel',
  ruolo: 'ruolo',
  tipo: 'tipo',
  richiesta: 'richiesta',
  origine: 'origine',
  industry: 'industry',
  dipendenti: 'dipendenti',
  hanno_sito: 'hanno_sito',
  company_web: 'company_web',
  esperienza_us: 'esperienza_us',
  stadio_pipeline: 'stadio_pipeline',
  stato_lead: 'stato_lead',
  valore: 'valore',
  data_chiusura: 'data_chiusura',
  owner: 'owner',
  note: 'note',
}

export function mapInboundPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, dbKey] of Object.entries(INBOUND_FIELD_MAP)) {
    if (raw[key] !== undefined) result[dbKey] = raw[key]
  }
  return result
}

export { validateSecret }
