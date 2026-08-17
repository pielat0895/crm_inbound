// Coppie bg/fg per i badge di stadio/stato/appuntamento, stessa palette del
// mockup Urbistat (CHIP / STATO_CHIP / APP_CHIP). Distinti da
// components/dashboard-preview/tokens.ts, che espone un solo colore per
// chiave (usato per barre/grafici, non per badge con testo leggibile sopra).
import { PLUM, ORANGE, TEAL, SKY, BLUE, GRAY_150, GRAY_500, WHITE } from '@/components/dashboard-preview/tokens'

type BadgeColors = { bg: string; fg: string }

const STAGE_BADGE: Record<string, BadgeColors> = {
  'Lead In': { bg: SKY, fg: PLUM },
  'Discovery': { bg: BLUE, fg: WHITE },
  'Proposal Sent': { bg: TEAL, fg: PLUM },
  'Proposal Signed': { bg: ORANGE, fg: WHITE },
}

const STATO_BADGE: Record<string, BadgeColors> = {
  'In corso': { bg: GRAY_150, fg: PLUM },
  'In chiusura': { bg: BLUE, fg: WHITE },
  'Rimandato': { bg: SKY, fg: PLUM },
  'Vinto': { bg: TEAL, fg: PLUM },
  'Perso': { bg: ORANGE, fg: WHITE },
  'Cliente': { bg: TEAL, fg: PLUM },
  'Non qualificato': { bg: GRAY_150, fg: GRAY_500 },
  'Studente': { bg: GRAY_150, fg: GRAY_500 },
}

const APPUNTAMENTO_BADGE: Record<string, BadgeColors> = {
  'Non schedulato': { bg: GRAY_150, fg: GRAY_500 },
  'Schedulato': { bg: SKY, fg: PLUM },
  'Effettuato': { bg: TEAL, fg: PLUM },
  'Non presentato': { bg: ORANGE, fg: WHITE },
}

const FALLBACK: BadgeColors = { bg: GRAY_150, fg: PLUM }

export function stageBadgeColors(stadio: string): BadgeColors {
  return STAGE_BADGE[stadio] ?? FALLBACK
}

export function statoBadgeColors(stato: string): BadgeColors {
  return STATO_BADGE[stato] ?? FALLBACK
}

export function appuntamentoBadgeColors(stato: string): BadgeColors {
  return APPUNTAMENTO_BADGE[stato] ?? FALLBACK
}
