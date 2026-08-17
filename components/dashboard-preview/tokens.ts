// Token dal design system "Urbistat" importato via claude.ai/design.
// Isolati in questo file: non toccano lib/stage-colors.ts (dashboard di produzione).

export const PLUM = '#372E35'
export const ORANGE = '#FE6603'
export const ORANGE_HOVER = '#E45400'
export const TEAL = '#75C8BE'
export const SKY = '#9FC8E8'
export const BLUE = '#0E3AB7'
export const GRAY_100 = '#EEEEEE'
export const GRAY_150 = '#E2E2E2'
export const GRAY_BORDER = '#D6D6D6'
export const GRAY_500 = '#868686'
export const WHITE = '#FFFFFF'

export const HEADING_FONT = "'Brygada 1918', Georgia, serif"
export const BODY_FONT = "'Open Sans', system-ui, sans-serif"

// Colore per stadio pipeline, stesso ordine/palette del mockup Urbistat
// (Lead In → Discovery → Proposal Sent → Proposal Signed).
export const STAGE_COLORS: Record<string, string> = {
  'Lead In': SKY,
  'Discovery': BLUE,
  'Proposal Sent': TEAL,
  'Proposal Signed': ORANGE,
}

// Stessa sequenza, usata per grafici "a imbuto"/progressione dove il mockup
// usa PLUM/BLUE/TEAL/ORANGE invece di SKY/BLUE/TEAL/ORANGE.
export const STAGE_COLORS_FUNNEL: Record<string, string> = {
  'Lead In': PLUM,
  'Discovery': BLUE,
  'Proposal Sent': TEAL,
  'Proposal Signed': ORANGE,
}

export const STATO_APPUNTAMENTO_PREVIEW_COLORS: Record<string, string> = {
  'Non schedulato': GRAY_500,
  'Schedulato': SKY,
  'Effettuato': TEAL,
  'Non presentato': ORANGE,
}

export const STATO_TERMINALI_PREVIEW_COLORS: Record<string, string> = {
  'Vinto': TEAL,
  'Perso': ORANGE,
  'Cliente': BLUE,
  'Non qualificato': GRAY_500,
  'Studente': SKY,
}
