// Sanitizza un termine di ricerca prima di interpolarlo in un filtro PostgREST `.or(...)`.
// Rimuove i caratteri che hanno significato sintattico in PostgREST — virgola (separa
// condizioni), parentesi (raggruppano), wildcard `%`/`*`, backslash, apici — così un
// input malevolo non può uscire dal pattern ilike e iniettare filtri arbitrari.
export function sanitizeSearchTerm(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .replace(/[%*(),\\"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
}
