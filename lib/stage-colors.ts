// Stadio: posizione nel funnel (4 valori, mai terminale — vedi types/index.ts).
export const STAGE_BADGE_CLASSES: Record<string, string> = {
  'Lead In':         'bg-blue-100 text-blue-700',
  'Discovery':       'bg-violet-100 text-violet-700',
  'Proposal Sent':   'bg-amber-100 text-amber-700',
  'Proposal Signed': 'bg-emerald-100 text-emerald-700',
}

export const STAGE_CHART_COLORS: Record<string, string> = {
  'Lead In':         '#6366f1',
  'Discovery':       '#8b5cf6',
  'Proposal Sent':   '#f59e0b',
  'Proposal Signed': '#10b981',
}

// Stato: esito/salute del lead (8 valori, include gli stati terminali).
export const STATO_BADGE_CLASSES: Record<string, string> = {
  'In corso':        'bg-blue-100 text-blue-700',
  'In chiusura':     'bg-violet-100 text-violet-700',
  'Rimandato':       'bg-amber-100 text-amber-700',
  'Vinto':           'bg-green-100 text-green-700',
  'Perso':           'bg-red-100 text-red-700',
  'Cliente':         'bg-emerald-100 text-emerald-700',
  'Non qualificato': 'bg-gray-100 text-gray-600',
  'Studente':        'bg-slate-200 text-slate-700',
}

// Stato appuntamento: esito dell'appuntamento (4 valori, indipendente da stato/stadio).
export const STATO_APPUNTAMENTO_BADGE_CLASSES: Record<string, string> = {
  'Non schedulato': 'bg-gray-100 text-gray-600',
  'Schedulato':     'bg-blue-100 text-blue-700',
  'Effettuato':     'bg-green-100 text-green-700',
  'Non presentato': 'bg-red-100 text-red-700',
}

export const STATO_APPUNTAMENTO_CHART_COLORS: Record<string, string> = {
  'Non schedulato': '#9ca3af',
  'Schedulato':     '#6366f1',
  'Effettuato':     '#10b981',
  'Non presentato': '#ef4444',
}

// Sottoinsieme di STATO_BADGE_CLASSES: solo gli esiti terminali, per il grafico "Distribuzione esiti".
export const STATO_TERMINALI_CHART_COLORS: Record<string, string> = {
  'Vinto':           '#10b981',
  'Perso':           '#ef4444',
  'Cliente':         '#14b8a6',
  'Non qualificato': '#9ca3af',
  'Studente':        '#64748b',
}
