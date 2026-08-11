# Miglioramenti KPI Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correggere il mix di coorti temporali nei KPI dashboard e aggiungere le metriche mancanti (forecast pesato, performance owner, distribuzione esiti, scheduling→chiusura, lead a rischio) definite in `docs/superpowers/specs/2026-08-11-dashboard-kpi-improvements-design.md`.

**Architecture:** Le funzioni pure di calcolo KPI vengono estratte in `lib/dashboard-metrics.ts` (nuovo) e `lib/tasks.ts` (estensione), testabili in isolamento. `app/dashboard/page.tsx` resta l'unico posto che decide quali coorti (apertura vs chiusura) passare a queste funzioni. Le probabilità di stadio sono una nuova chiave nella tabella `settings` esistente (stesso pattern key/value di `pipeline_stages`), editabile da una nuova sezione in Settings.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest, Recharts, Supabase.

## Global Constraints

- Ogni rapporto percentuale usa l'helper `percent(numeratore, denominatore)` da `lib/dashboard-metrics.ts` — mai `Math.round` inline duplicato, mai divisione per zero non gestita.
- Nessuna modifica allo schema `leads`, nessuna migrazione dati — tutte le nuove metriche derivano da campi già esistenti.
- Ogni nuova coorte temporale è o **coorte apertura** (`data_apertura` nel periodo, esito attuale qualunque sia oggi) o **coorte chiusura** (`data_chiusura` nel periodo) — mai un mix delle due nello stesso rapporto. Vedi la sezione "Coorti temporali" della spec.
- Nessun valore di probabilità stadio hardcoded o indovinato: uno stadio senza probabilità configurata in Settings vale `0` nel forecast, mai un default stimato.
- Le nuove funzioni di calcolo KPI vivono in `lib/dashboard-metrics.ts` (metriche generiche) o `lib/tasks.ts` (metriche che dipendono da `giorniFermo`/`isActiveLead`, già lì) — mai inline in `app/dashboard/page.tsx`, per restare testabili.
- Segui i pattern esistenti nel repo: componenti grafico duplicati vicini invece di un'astrazione condivisa (vedi `AppuntamentoChart.tsx` accanto a `PipelineChart.tsx`), mappe colori in `lib/stage-colors.ts` con test di parità contro la lista valori sorgente.

---

### Task 1: Settings — campo probabilità stadio (tipo + persistenza + API)

**Files:**
- Modify: `types/index.ts:69-72` (tipo `Settings`)
- Modify: `lib/settings.ts` (`getSettings`)
- Modify: `app/api/settings/route.ts` (`PATCH`)
- Modify: `lib/tasks.test.ts:320` (literale `SETTINGS` da aggiornare per il nuovo campo obbligatorio)

**Interfaces:**
- Produce: `Settings.pipeline_stage_probabilities: Record<string, number>` — percentuale 0-100 per ogni stadio presente in `pipeline_stages`; stadi assenti dalla mappa contano 0.
- Consumato da: Task 2 (UI Settings), Task 8 (`weightedForecast` in dashboard).

- [ ] **Step 1: Estendi il tipo `Settings`**

In `types/index.ts`, sostituisci:

```ts
export type Settings = {
  followup_threshold_days: number
  pipeline_stages: string[]
}
```

con:

```ts
export type Settings = {
  followup_threshold_days: number
  pipeline_stages: string[]
  pipeline_stage_probabilities: Record<string, number>
}
```

- [ ] **Step 2: Aggiorna il literal di test che ora non compila**

In `lib/tasks.test.ts:320`, sostituisci:

```ts
const SETTINGS: Settings = { followup_threshold_days: 7, pipeline_stages: STAGES }
```

con:

```ts
const SETTINGS: Settings = { followup_threshold_days: 7, pipeline_stages: STAGES, pipeline_stage_probabilities: {} }
```

- [ ] **Step 3: Verifica che i test esistenti passino ancora**

Run: `npm test`
Expected: PASS (nessuna regressione, il campo era solo mancante nel literal)

- [ ] **Step 4: Aggiungi il parsing in `getSettings`**

In `lib/settings.ts`, nel `return` di `getSettings`, aggiungi la riga:

```ts
  return {
    followup_threshold_days: parseInt(map['followup_threshold_days'] ?? '7', 10),
    pipeline_stages: JSON.parse(map['pipeline_stages'] ?? '["Lead In","Discovery","Proposal Sent","Proposal Signed"]'),
    pipeline_stage_probabilities: JSON.parse(map['pipeline_stage_probabilities'] ?? '{}'),
  }
```

- [ ] **Step 5: Aggiungi la validazione in `PATCH /api/settings`**

In `app/api/settings/route.ts`, dopo il blocco `if (body.pipeline_stages !== undefined) { ... }`, aggiungi:

```ts
  if (body.pipeline_stage_probabilities !== undefined) {
    const probs = body.pipeline_stage_probabilities
    if (typeof probs !== 'object' || probs === null || Array.isArray(probs)) {
      return NextResponse.json({ error: 'pipeline_stage_probabilities must be an object' }, { status: 400 })
    }
    for (const [stage, value] of Object.entries(probs)) {
      if (typeof value !== 'number' || isNaN(value) || value < 0 || value > 100) {
        return NextResponse.json({ error: `Invalid probability for stage "${stage}"` }, { status: 400 })
      }
    }
    await updateSetting('pipeline_stage_probabilities', JSON.stringify(probs))
  }
```

- [ ] **Step 6: Verifica manuale dell'endpoint**

Run: `npm run dev` (in background se non già attivo), poi:
```bash
curl -s http://localhost:3000/api/settings | head -c 300
```
Expected: la risposta JSON include `"pipeline_stage_probabilities":{}`

- [ ] **Step 7: Run full test suite e commit**

Run: `npm test`
Expected: PASS, 0 failures

```bash
git add types/index.ts lib/settings.ts lib/tasks.test.ts app/api/settings/route.ts
git commit -m "feat: add pipeline_stage_probabilities setting"
```

---

### Task 2: Settings UI — editor probabilità per stadio

**Files:**
- Modify: `app/settings/page.tsx`

**Interfaces:**
- Consumes: `Settings.pipeline_stage_probabilities` (Task 1), `PATCH /api/settings` con body `{ pipeline_stage_probabilities: Record<string, number> }` (Task 1).

- [ ] **Step 1: Aggiungi lo stato locale per le probabilità**

In `app/settings/page.tsx`, accanto a `const [threshold, setThreshold] = useState('')`, aggiungi:

```ts
  const [probabilities, setProbabilities] = useState<Record<string, string>>({})
  const [savingProbs, setSavingProbs] = useState(false)
  const [savedProbs, setSavedProbs] = useState(false)
```

- [ ] **Step 2: Inizializza le probabilità nel `useEffect` di caricamento**

Sostituisci:

```ts
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((s: Settings) => {
        setSettings(s)
        setThreshold(String(s.followup_threshold_days))
      })
  }, [])
```

con:

```ts
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((s: Settings) => {
        setSettings(s)
        setThreshold(String(s.followup_threshold_days))
        const probs: Record<string, string> = {}
        for (const stage of s.pipeline_stages) {
          probs[stage] = String(s.pipeline_stage_probabilities[stage] ?? 0)
        }
        setProbabilities(probs)
      })
  }, [])
```

- [ ] **Step 3: Aggiungi l'handler di salvataggio**

Dopo `handleSave`, aggiungi:

```ts
  async function handleSaveProbabilities() {
    setSavingProbs(true)
    const payload: Record<string, number> = {}
    for (const [stage, value] of Object.entries(probabilities)) {
      const n = parseInt(value, 10)
      payload[stage] = isNaN(n) ? 0 : Math.min(100, Math.max(0, n))
    }
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_stage_probabilities: payload }),
    })
    if (res.ok) { setSavedProbs(true); setTimeout(() => setSavedProbs(false), 2000) }
    setSavingProbs(false)
  }
```

- [ ] **Step 4: Aggiungi la card nella UI**

Dopo la `<Card>` "Follow-up" (dopo il suo `</Card>` di chiusura) e prima della card "Gestione Database", inserisci:

```tsx
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Probabilità di chiusura per stadio</CardTitle>
          <CardDescription>Usata per il forecast pesato in dashboard. Stadi senza probabilità configurata contano 0%.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.pipeline_stages.map(stage => (
            <div key={stage} className="flex items-center gap-2">
              <Label htmlFor={`prob-${stage}`} className="flex-1">{stage}</Label>
              <Input
                id={`prob-${stage}`}
                type="number"
                min={0}
                max={100}
                value={probabilities[stage] ?? '0'}
                onChange={e => setProbabilities(p => ({ ...p, [stage]: e.target.value }))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          ))}
          <Button onClick={handleSaveProbabilities} disabled={savingProbs} size="sm">
            {savedProbs ? 'Salvato!' : savingProbs ? 'Salvataggio...' : 'Salva'}
          </Button>
        </CardContent>
      </Card>
```

- [ ] **Step 5: Verifica manuale nel browser**

Con `npm run dev` attivo, apri `/settings`: la nuova card mostra un input per ogni stadio pipeline corrente, modifica un valore, premi Salva, ricarica la pagina e verifica che il valore sia persistito.

- [ ] **Step 6: Run test suite e commit**

Run: `npm test`
Expected: PASS (nessun test esistente copre questa pagina — nessuna regressione attesa)

```bash
git add app/settings/page.tsx
git commit -m "feat: add per-stage probability editor to Settings"
```

---

### Task 3: `lib/dashboard-metrics.ts` — funzioni pure di calcolo KPI

**Files:**
- Create: `lib/dashboard-metrics.ts`
- Test: `lib/dashboard-metrics.test.ts`

**Interfaces:**
- Consumes: `LeadWithComputed` da `@/types`; `makeLead`/`baseLead`/`REF` da `lib/tasks.test.ts` (già esportati, riusati per i fixture di test).
- Produces:
  - `percent(numerator: number, denominator: number): number`
  - `winRateVintoPerso(leads: LeadWithComputed[]): { vinti: number; persi: number; rate: number }`
  - `weightedForecast(openLeads: LeadWithComputed[], probabilities: Record<string, number>): number`
  - `PerformanceRow = { key: string; totale: number; vinti: number; tasso: number }`
  - `performanceByKey(cohortLeads: LeadWithComputed[], keyFn: (lead: LeadWithComputed) => string | null): PerformanceRow[]`
  - `distribuzioneEsiti(closedCohortLeads: LeadWithComputed[], statoTerminali: string[]): { stato: string; count: number }[]`
  - `schedulingToCloseRate(closedDecisiveLeads: LeadWithComputed[]): { vinti: number; totale: number; rate: number }`
  - Consumato da: Task 8 (`app/dashboard/page.tsx`).

- [ ] **Step 1: Scrivi i test (falliranno, il modulo non esiste ancora)**

Crea `lib/dashboard-metrics.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  percent, winRateVintoPerso, weightedForecast, performanceByKey,
  distribuzioneEsiti, schedulingToCloseRate,
} from './dashboard-metrics'
import { makeLead } from './tasks.test'

describe('percent', () => {
  it('rounds the ratio as a percentage', () => {
    expect(percent(1, 3)).toBe(33)
  })

  it('returns 0 when denominator is 0', () => {
    expect(percent(5, 0)).toBe(0)
  })
})

describe('winRateVintoPerso', () => {
  it('counts vinti and persi, rate over their sum', () => {
    const leads = [
      makeLead({ id: '1', stato: 'Vinto' }),
      makeLead({ id: '2', stato: 'Vinto' }),
      makeLead({ id: '3', stato: 'Perso' }),
    ]
    expect(winRateVintoPerso(leads)).toEqual({ vinti: 2, persi: 1, rate: 67 })
  })

  it('ignores non-decisive stato values', () => {
    const leads = [
      makeLead({ id: '1', stato: 'Vinto' }),
      makeLead({ id: '2', stato: 'Cliente' }),
      makeLead({ id: '3', stato: 'Non qualificato' }),
    ]
    expect(winRateVintoPerso(leads)).toEqual({ vinti: 1, persi: 0, rate: 100 })
  })

  it('returns rate 0 when there are no decisive leads', () => {
    expect(winRateVintoPerso([])).toEqual({ vinti: 0, persi: 0, rate: 0 })
  })
})

describe('weightedForecast', () => {
  it('sums valore weighted by stage probability', () => {
    const leads = [
      makeLead({ id: '1', stadio_pipeline: 'Discovery', valore: 1000 }),
      makeLead({ id: '2', stadio_pipeline: 'Proposal Sent', valore: 2000 }),
    ]
    const probs = { 'Discovery': 30, 'Proposal Sent': 60 }
    expect(weightedForecast(leads, probs)).toBe(1500) // 300 + 1200
  })

  it('treats a stage missing from probabilities as 0%', () => {
    const leads = [makeLead({ id: '1', stadio_pipeline: 'Lead In', valore: 1000 })]
    expect(weightedForecast(leads, {})).toBe(0)
  })

  it('treats null valore as 0', () => {
    const leads = [makeLead({ id: '1', stadio_pipeline: 'Discovery', valore: null })]
    expect(weightedForecast(leads, { 'Discovery': 50 })).toBe(0)
  })
})

describe('performanceByKey', () => {
  it('groups by key and computes win rate per group', () => {
    const leads = [
      makeLead({ id: '1', origine: 'Info', stato: 'Vinto' }),
      makeLead({ id: '2', origine: 'Info', stato: 'Perso' }),
      makeLead({ id: '3', origine: 'Eventi', stato: 'Vinto' }),
    ]
    const rows = performanceByKey(leads, l => l.origine).sort((a, b) => a.key.localeCompare(b.key))
    expect(rows).toEqual([
      { key: 'Eventi', totale: 1, vinti: 1, tasso: 100 },
      { key: 'Info', totale: 2, vinti: 1, tasso: 50 },
    ])
  })

  it('buckets a null key under N/D', () => {
    const leads = [makeLead({ id: '1', origine: null, stato: 'Vinto' })]
    expect(performanceByKey(leads, l => l.origine)).toEqual([
      { key: 'N/D', totale: 1, vinti: 1, tasso: 100 },
    ])
  })
})

describe('distribuzioneEsiti', () => {
  it('counts leads per terminal stato, in the given order', () => {
    const leads = [
      makeLead({ id: '1', stato: 'Vinto' }),
      makeLead({ id: '2', stato: 'Perso' }),
      makeLead({ id: '3', stato: 'Perso' }),
    ]
    expect(distribuzioneEsiti(leads, ['Vinto', 'Perso', 'Cliente'])).toEqual([
      { stato: 'Vinto', count: 1 },
      { stato: 'Perso', count: 2 },
      { stato: 'Cliente', count: 0 },
    ])
  })
})

describe('schedulingToCloseRate', () => {
  it('rate is vinti over Effettuato leads only', () => {
    const leads = [
      makeLead({ id: '1', stato_appuntamento: 'Effettuato', stato: 'Vinto' }),
      makeLead({ id: '2', stato_appuntamento: 'Effettuato', stato: 'Perso' }),
      makeLead({ id: '3', stato_appuntamento: 'Non presentato', stato: 'Perso' }),
    ]
    expect(schedulingToCloseRate(leads)).toEqual({ vinti: 1, totale: 2, rate: 50 })
  })

  it('returns rate 0 when no lead has Effettuato', () => {
    const leads = [makeLead({ id: '1', stato_appuntamento: 'Schedulato', stato: 'Vinto' })]
    expect(schedulingToCloseRate(leads)).toEqual({ vinti: 0, totale: 0, rate: 0 })
  })
})
```

- [ ] **Step 2: Esegui i test, verifica che falliscano**

Run: `npx vitest run lib/dashboard-metrics.test.ts`
Expected: FAIL con "Cannot find module './dashboard-metrics'"

- [ ] **Step 3: Implementa il modulo**

Crea `lib/dashboard-metrics.ts`:

```ts
import type { LeadWithComputed } from '@/types'

/** Percentuale arrotondata, 0 se il denominatore è 0 (mai NaN). */
export function percent(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0
}

/** Win rate tra i soli lead con esito Vinto/Perso — ignora gli altri stati terminali. */
export function winRateVintoPerso(
  leads: LeadWithComputed[],
): { vinti: number; persi: number; rate: number } {
  const vinti = leads.filter(l => l.stato === 'Vinto').length
  const persi = leads.filter(l => l.stato === 'Perso').length
  return { vinti, persi, rate: percent(vinti, vinti + persi) }
}

/** Somma valore pesata per la probabilità di chiusura del rispettivo stadio (0% se non configurata). */
export function weightedForecast(
  openLeads: LeadWithComputed[],
  probabilities: Record<string, number>,
): number {
  return openLeads.reduce(
    (sum, l) => sum + (l.valore ?? 0) * ((probabilities[l.stadio_pipeline] ?? 0) / 100),
    0,
  )
}

export type PerformanceRow = { key: string; totale: number; vinti: number; tasso: number }

/** Raggruppa per keyFn (null -> "N/D") e calcola tasso di vittoria per gruppo. */
export function performanceByKey(
  cohortLeads: LeadWithComputed[],
  keyFn: (lead: LeadWithComputed) => string | null,
): PerformanceRow[] {
  const groups = new Map<string, LeadWithComputed[]>()
  for (const lead of cohortLeads) {
    const key = keyFn(lead) ?? 'N/D'
    const group = groups.get(key) ?? []
    group.push(lead)
    groups.set(key, group)
  }
  return Array.from(groups.entries()).map(([key, group]) => {
    const vinti = group.filter(l => l.stato === 'Vinto').length
    return { key, totale: group.length, vinti, tasso: percent(vinti, group.length) }
  })
}

/** Conteggio per ciascuno stato terminale, nell'ordine passato. */
export function distribuzioneEsiti(
  closedCohortLeads: LeadWithComputed[],
  statoTerminali: string[],
): { stato: string; count: number }[] {
  return statoTerminali.map(stato => ({
    stato,
    count: closedCohortLeads.filter(l => l.stato === stato).length,
  }))
}

/** Tra i lead chiusi (Vinto/Perso) che hanno fatto l'appuntamento, quota Vinto. */
export function schedulingToCloseRate(
  closedDecisiveLeads: LeadWithComputed[],
): { vinti: number; totale: number; rate: number } {
  const effettuati = closedDecisiveLeads.filter(l => l.stato_appuntamento === 'Effettuato')
  const vinti = effettuati.filter(l => l.stato === 'Vinto').length
  return { vinti, totale: effettuati.length, rate: percent(vinti, effettuati.length) }
}
```

- [ ] **Step 4: Esegui i test, verifica che passino**

Run: `npx vitest run lib/dashboard-metrics.test.ts`
Expected: PASS, 15 test

- [ ] **Step 5: Run full test suite e commit**

Run: `npm test`
Expected: PASS, 0 failures

```bash
git add lib/dashboard-metrics.ts lib/dashboard-metrics.test.ts
git commit -m "feat: add pure KPI computation functions in lib/dashboard-metrics"
```

---

### Task 4: `lib/stage-colors.ts` — colori per il grafico distribuzione esiti

**Files:**
- Modify: `lib/stage-colors.ts`
- Modify: `lib/stage-colors.test.ts`

**Interfaces:**
- Produce: `STATO_TERMINALI_CHART_COLORS: Record<string, string>` — una voce per ciascuno dei 5 valori di `STATO_TERMINALI`.
- Consumato da: Task 6 (`EsitiChart.tsx`).

- [ ] **Step 1: Aggiungi il test di parità (fallirà, la costante non esiste)**

In `lib/stage-colors.test.ts`, aggiorna l'import in cima al file:

```ts
import { STAGE_BADGE_CLASSES, STAGE_CHART_COLORS, STATO_BADGE_CLASSES, STATO_APPUNTAMENTO_BADGE_CLASSES, STATO_APPUNTAMENTO_CHART_COLORS, STATO_TERMINALI_CHART_COLORS } from './stage-colors'
import { DEFAULT_PIPELINE_STAGES, STATO_OPTIONS, STATO_APPUNTAMENTO_OPTIONS, STATO_TERMINALI } from '@/types'
```

e aggiungi, dentro il blocco `describe`:

```ts
  it('STATO_TERMINALI_CHART_COLORS has exactly the STATO_TERMINALI keys', () => {
    expect(Object.keys(STATO_TERMINALI_CHART_COLORS).sort()).toEqual([...STATO_TERMINALI].sort())
  })
```

- [ ] **Step 2: Esegui i test, verifica che falliscano**

Run: `npx vitest run lib/stage-colors.test.ts`
Expected: FAIL — `STATO_TERMINALI_CHART_COLORS` non esportata

- [ ] **Step 3: Aggiungi la costante**

In `lib/stage-colors.ts`, in fondo al file, aggiungi:

```ts
// Sottoinsieme di STATO_BADGE_CLASSES: solo gli esiti terminali, per il grafico "Distribuzione esiti".
export const STATO_TERMINALI_CHART_COLORS: Record<string, string> = {
  'Vinto':           '#10b981',
  'Perso':           '#ef4444',
  'Cliente':         '#14b8a6',
  'Non qualificato': '#9ca3af',
  'Studente':        '#64748b',
}
```

- [ ] **Step 4: Esegui i test, verifica che passino**

Run: `npx vitest run lib/stage-colors.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite e commit**

Run: `npm test`
Expected: PASS, 0 failures

```bash
git add lib/stage-colors.ts lib/stage-colors.test.ts
git commit -m "feat: add chart colors for outcome distribution"
```

---

### Task 5: `lib/tasks.ts` — `leadARischio`

**Files:**
- Modify: `lib/tasks.ts`
- Modify: `lib/tasks.test.ts`

**Interfaces:**
- Consumes: `isActiveLead`, `giorniFermo` (già in `lib/tasks.ts`).
- Produces: `LeadARischio = { lead: LeadWithComputed; giorni: number; maiContattato: boolean }`, `leadARischio(leads: LeadWithComputed[], now: Date, thresholdDays: number): LeadARischio[]` (ordinato per `giorni` decrescente).
- Consumato da: Task 8 (`app/dashboard/page.tsx`).

- [ ] **Step 1: Scrivi i test (falliranno, la funzione non esiste)**

In `lib/tasks.test.ts`, dopo il blocco `describe('buildDormienti', ...)` (prima di `const SETTINGS: Settings = ...`), aggiungi:

```ts
describe('leadARischio', () => {
  it('includes an active lead stalled past the threshold', () => {
    const leads = [makeLead({ id: 'l-1', data_ultimo_contatto: '2026-07-01' })] // 26 giorni da REF
    const result = leadARischio(leads, REF, 21)
    expect(result).toHaveLength(1)
    expect(result[0].lead.id).toBe('l-1')
    expect(result[0].giorni).toBe(26)
    expect(result[0].maiContattato).toBe(false)
  })

  it('includes a never-contacted lead stalled since data_apertura', () => {
    const leads = [makeLead({ id: 'l-1', data_ultimo_contatto: null, data_apertura: '2026-06-27' })] // 30 giorni
    const result = leadARischio(leads, REF, 21)
    expect(result).toEqual([{ lead: leads[0], giorni: 30, maiContattato: true }])
  })

  it('excludes a lead below the threshold', () => {
    const leads = [makeLead({ id: 'l-1', data_ultimo_contatto: '2026-07-20' })] // 7 giorni
    expect(leadARischio(leads, REF, 21)).toEqual([])
  })

  it('excludes a closed lead regardless of how stale', () => {
    const leads = [makeLead({ id: 'l-1', stato: 'Perso', data_ultimo_contatto: '2026-01-01' })]
    expect(leadARischio(leads, REF, 21)).toEqual([])
  })

  it('sorts by giorni descending', () => {
    const leads = [
      makeLead({ id: 'meno-fermo', data_ultimo_contatto: '2026-07-01' }), // 26
      makeLead({ id: 'piu-fermo', data_ultimo_contatto: '2026-06-01' }),  // 56
    ]
    const result = leadARischio(leads, REF, 21)
    expect(result.map(r => r.lead.id)).toEqual(['piu-fermo', 'meno-fermo'])
  })
})
```

e aggiorna l'import in cima al file:

```ts
import { toDateString, addDays, isActiveLead, advancedStages, buildDaFareOra, buildInArrivo, buildProssimiChiusura, buildDormienti, buildTaskFeed, leadARischio } from './tasks'
```

- [ ] **Step 2: Esegui i test, verifica che falliscano**

Run: `npx vitest run lib/tasks.test.ts -t leadARischio`
Expected: FAIL — `leadARischio` non esportata

- [ ] **Step 3: Implementa la funzione**

In `lib/tasks.ts`, subito dopo la funzione `giorniFermo` (dopo la sua chiusura `}`, prima del commento `/** Sezione "Dormienti"...`), aggiungi:

```ts
export type LeadARischio = { lead: LeadWithComputed; giorni: number; maiContattato: boolean }

/**
 * Lead attivi fermi da almeno thresholdDays giorni, incluso chi non è mai
 * stato contattato (fermo dalla data apertura, non invisibile per mancanza
 * di giorni_ultimo_contatto — stessa logica di giorniFermo).
 */
export function leadARischio(
  leads: LeadWithComputed[],
  now: Date,
  thresholdDays: number,
): LeadARischio[] {
  const result: LeadARischio[] = []
  for (const lead of leads) {
    if (!isActiveLead(lead)) continue
    const { giorni, maiContattato } = giorniFermo(lead, now)
    if (giorni !== null && giorni >= thresholdDays) {
      result.push({ lead, giorni, maiContattato })
    }
  }
  return result.sort((a, b) => b.giorni - a.giorni)
}
```

- [ ] **Step 4: Esegui i test, verifica che passino**

Run: `npx vitest run lib/tasks.test.ts -t leadARischio`
Expected: PASS, 5 test

- [ ] **Step 5: Run full test suite e commit**

Run: `npm test`
Expected: PASS, 0 failures

```bash
git add lib/tasks.ts lib/tasks.test.ts
git commit -m "feat: add leadARischio, including never-contacted stalled leads"
```

---

### Task 6: Nuovi componenti grafico — `OwnerConversionChart`, `EsitiChart`

**Files:**
- Create: `components/dashboard/OwnerConversionChart.tsx`
- Create: `components/dashboard/EsitiChart.tsx`

**Interfaces:**
- `OwnerConversionChart` produce lo stesso tipo di grafico di `ConversionChart.tsx` (già esistente) ma con chiave `owner` invece di `origine`. Props: `data: { owner: string; tassoVinti: number; tassoNonVinti: number; tasso: number }[]`, `onSegmentClick?: (owner: string) => void`.
- `EsitiChart` produce lo stesso tipo di grafico di `AppuntamentoChart.tsx` (già esistente) ma legge `STATO_TERMINALI_CHART_COLORS` (Task 4). Props: `data: { stato: string; count: number }[]`, `onSegmentClick?: (stato: string) => void`.
- Consumati da: Task 7 (`ChartsSection.tsx`).

- [ ] **Step 1: Crea `OwnerConversionChart.tsx`**

```tsx
'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

type Props = {
  data: { owner: string; tassoVinti: number; tassoNonVinti: number; tasso: number }[]
  onSegmentClick?: (owner: string) => void
}

export function OwnerConversionChart({ data, onSegmentClick }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="owner" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={48} />
        <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(value, name) => [
            `${value}%`,
            name === 'tassoVinti' ? 'Convertiti' : 'Non convertiti',
          ]}
        />
        <Legend formatter={v => v === 'tassoVinti' ? 'Convertiti' : 'Non convertiti'} wrapperStyle={{ fontSize: 11 }} />
        <Bar
          dataKey="tassoVinti"
          stackId="a"
          fill="#10b981"
          radius={[0, 0, 0, 0]}
          name="tassoVinti"
          cursor={onSegmentClick ? 'pointer' : undefined}
          onClick={onSegmentClick ? (entry: any) => onSegmentClick(entry.owner) : undefined}
        />
        <Bar
          dataKey="tassoNonVinti"
          stackId="a"
          fill="#e5e7eb"
          radius={[4, 4, 0, 0]}
          name="tassoNonVinti"
          cursor={onSegmentClick ? 'pointer' : undefined}
          onClick={onSegmentClick ? (entry: any) => onSegmentClick(entry.owner) : undefined}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Crea `EsitiChart.tsx`**

```tsx
'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { STATO_TERMINALI_CHART_COLORS } from '@/lib/stage-colors'

type Props = {
  data: { stato: string; count: number }[]
  onSegmentClick?: (stato: string) => void
}

export function EsitiChart({ data, onSegmentClick }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 32, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis dataKey="stato" type="category" tick={{ fontSize: 11 }} width={110} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(value) => [`${value} lead`, 'Esito']}
        />
        <Bar
          dataKey="count"
          radius={[0, 4, 4, 0]}
          cursor={onSegmentClick ? 'pointer' : undefined}
          onClick={onSegmentClick ? (entry: any) => onSegmentClick(entry.stato) : undefined}
        >
          {data.map(entry => (
            <Cell key={entry.stato} fill={STATO_TERMINALI_CHART_COLORS[entry.stato] ?? '#6366f1'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 3: Verifica che il progetto compili**

Run: `npx tsc --noEmit`
Expected: nessun nuovo errore introdotto da questi due file (possono restare inutilizzati fino al Task 7 — nessun errore "unused" atteso in TS/TSX per componenti esportati non ancora importati altrove)

- [ ] **Step 4: Run full test suite e commit**

Run: `npm test`
Expected: PASS, 0 failures (nessun test unitario per questi componenti grafico — coerente con `ConversionChart`/`AppuntamentoChart`, mai testati direttamente in questo repo)

```bash
git add components/dashboard/OwnerConversionChart.tsx components/dashboard/EsitiChart.tsx
git commit -m "feat: add OwnerConversionChart and EsitiChart components"
```

---

### Task 7: `ChartsSection.tsx` — cablaggio nuovi grafici

**Files:**
- Modify: `components/dashboard/ChartsSection.tsx`

**Interfaces:**
- Consumes: `OwnerConversionChart`, `EsitiChart` (Task 6).
- Produces: `SlimLead.stato: string | null` (nuovo campo, consumato da Task 8 in `slimLeads`); nuove props `ownerConversionChartData` ed `esitiChartData` (consumate da Task 8).

- [ ] **Step 1: Importa i nuovi componenti**

In `components/dashboard/ChartsSection.tsx`, dopo l'import di `AppuntamentoChart`, aggiungi:

```ts
import { OwnerConversionChart } from '@/components/dashboard/OwnerConversionChart'
import { EsitiChart } from '@/components/dashboard/EsitiChart'
```

- [ ] **Step 2: Aggiungi `stato` a `SlimLead`**

Sostituisci il tipo `SlimLead`:

```ts
export type SlimLead = {
  id: string
  nome: string | null
  cognome: string | null
  azienda: string | null
  stadio_pipeline: string
  stato_appuntamento: string
  valore: number | null
  industry: string | null
  dipendenti: string | null
  origine: string | null
  data_apertura: string | null
  owner: string | null
}
```

con:

```ts
export type SlimLead = {
  id: string
  nome: string | null
  cognome: string | null
  azienda: string | null
  stadio_pipeline: string
  stato: string | null
  stato_appuntamento: string
  valore: number | null
  industry: string | null
  dipendenti: string | null
  origine: string | null
  data_apertura: string | null
  owner: string | null
}
```

- [ ] **Step 3: Aggiungi le nuove props**

Nel tipo `Props`, dopo `appuntamentoChartData: { stato: string; count: number }[]`, aggiungi:

```ts
  ownerConversionChartData: { owner: string; tassoVinti: number; tassoNonVinti: number; tasso: number }[]
  esitiChartData: { stato: string; count: number }[]
```

E nella destrutturazione dei parametri della funzione `ChartsSection`, aggiungi `ownerConversionChartData` ed `esitiChartData` accanto a `appuntamentoChartData`.

- [ ] **Step 4: Aggiungi l'handler per il click sul grafico esiti**

Dopo la funzione `openAppuntamento`, aggiungi:

```ts
  function openEsiti(stato: string) {
    open(`Esito: ${stato}`, leads.filter(l => l.stato === stato))
  }
```

(Il grafico "Performance owner" riusa l'handler `openOwner` già esistente — stesso campo `owner`, stesso filtro.)

- [ ] **Step 5: Aggiungi la nuova riga di grafici nel JSX**

Dopo il blocco:

```tsx
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Lead per owner</h2>
          <OwnerChart data={ownerChartData} onSegmentClick={openOwner} />
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Stato appuntamento</h2>
          <AppuntamentoChart data={appuntamentoChartData} onSegmentClick={openAppuntamento} />
        </div>
      </div>
```

aggiungi:

```tsx
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Performance owner</h2>
          <OwnerConversionChart data={ownerConversionChartData} onSegmentClick={openOwner} />
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Distribuzione esiti</h2>
          <EsitiChart data={esitiChartData} onSegmentClick={openEsiti} />
        </div>
      </div>
```

- [ ] **Step 6: Verifica che il progetto compili**

Run: `npx tsc --noEmit`
Expected: errori attesi SOLO in `app/dashboard/page.tsx` (che ancora non passa le nuove props — risolto nel Task 8), nessun errore in `ChartsSection.tsx` stesso

- [ ] **Step 7: Run full test suite e commit**

Run: `npm test`
Expected: PASS, 0 failures

```bash
git add components/dashboard/ChartsSection.tsx
git commit -m "feat: wire OwnerConversionChart and EsitiChart into ChartsSection"
```

---

### Task 8: `app/dashboard/page.tsx` — ricablaggio completo dei KPI

**Files:**
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: tutto quanto prodotto dai Task 1-7 (`percent`, `winRateVintoPerso`, `weightedForecast`, `performanceByKey`, `distribuzioneEsiti`, `schedulingToCloseRate` da `lib/dashboard-metrics.ts`; `leadARischio` da `lib/tasks.ts`; `Settings.pipeline_stage_probabilities`; `ChartsSection` con le nuove props; `SlimLead.stato`).

Questo task non ha test dedicati: nessun file di test esiste oggi per `app/dashboard/page.tsx` (Server Component Next.js, non unit-testabile senza mock pesanti di Supabase) — la correttezza dei calcoli è già coperta dai test dei Task 3 e 5. La verifica di questo task è: compilazione pulita, test suite verde, verifica manuale nel browser.

- [ ] **Step 1: Aggiorna gli import**

Sostituisci il blocco import in cima al file:

```tsx
import { Users, TrendingUp, Clock, AlertCircle, Euro, Trophy, Target, CalendarX } from 'lucide-react'
```

con:

```tsx
import { Users, TrendingUp, Clock, AlertCircle, Euro, Trophy, Target, CalendarX, Award, Gauge, CalendarCheck } from 'lucide-react'
```

e aggiungi, dopo l'import di `DashboardFilters`:

```tsx
import { percent, winRateVintoPerso, weightedForecast, performanceByKey, distribuzioneEsiti, schedulingToCloseRate } from '@/lib/dashboard-metrics'
import { leadARischio } from '@/lib/tasks'
```

- [ ] **Step 2: Sostituisci il blocco di calcolo coorti e KPI**

Sostituisci tutto il blocco da `const allLeads = baseLeads.filter(...)` (riga 66 dell'attuale file) fino a `const conversionChartData = conversionePerOrigine.map(...)` incluso (riga 146 dell'attuale file) con:

```tsx
  // Coorte apertura: lead aperti nel periodo, esito attuale qualunque sia oggi.
  const allLeads = baseLeads.filter(l => filterByDate(l, l.data_apertura))
  const openLeads = baseLeads.filter(l => !STATO_TERMINALI.includes(l.stato ?? ''))

  // Coorte chiusura: lead chiusi (data_chiusura) nel periodo.
  const closedInRange = baseLeads.filter(l => filterByDate(l, l.data_chiusura))
  const closedDecisive = closedInRange.filter(l => l.stato === 'Vinto' || l.stato === 'Perso')
  const wonLeads = closedInRange.filter(l => l.stato === 'Vinto')

  // Conversione lead (coorte apertura): quota di lead aperti nel periodo che sono OGGI Vinto.
  const leadWonToday = allLeads.filter(l => l.stato === 'Vinto').length
  const conversioneLeadRate = percent(leadWonToday, allLeads.length)

  // Win rate (coorte chiusura): tra i lead chiusi con esito Vinto/Perso, quota Vinto.
  const { vinti: winVinti, rate: winRate } = winRateVintoPerso(closedDecisive)

  const wonWithDays = wonLeads.filter(l => l.giorni_pipeline !== null)
  const avgDaysToClose = wonWithDays.length > 0
    ? Math.round(wonWithDays.reduce((sum, l) => sum + (l.giorni_pipeline ?? 0), 0) / wonWithDays.length)
    : 0

  const totalRevenue = wonLeads.reduce((sum, l) => sum + (l.valore ?? 0), 0)
  const pipelineValue = openLeads.reduce((sum, l) => sum + (l.valore ?? 0), 0)
  const forecastPesato = weightedForecast(openLeads, settings.pipeline_stage_probabilities)

  // Tasso no-show: esclude Schedulato (esito non ancora noto) e Non schedulato
  // (non applicabile) dal denominatore — risponde a "di chi arriva a un
  // appuntamento, quanti non si presentano".
  const nonPresentati = baseLeads.filter(l => l.stato_appuntamento === 'Non presentato').length
  const effettuati = baseLeads.filter(l => l.stato_appuntamento === 'Effettuato').length
  const noShowRate = percent(nonPresentati, nonPresentati + effettuati)

  const appuntamentoChartData = STATO_APPUNTAMENTO_OPTIONS.map(stato => ({
    stato,
    count: baseLeads.filter(l => l.stato_appuntamento === stato).length,
  }))

  // Tasso scheduling→chiusura: tra i lead chiusi (Vinto/Perso) che hanno fatto l'appuntamento.
  const { vinti: schedVinti, totale: schedTotale, rate: schedulingToCloseRateValue } = schedulingToCloseRate(closedDecisive)

  const esitiChartData = distribuzioneEsiti(closedInRange, STATO_TERMINALI)

  const rischio = leadARischio(openLeads, new Date(), settings.followup_threshold_days)

  const today = new Date().toISOString().split('T')[0]
  const todayFollowups = openLeads.filter(l => l.ricontattare === today)

  const leadsByStage = settings.pipeline_stages.map(stage => {
    const stageLeads = allLeads.filter(l => l.stadio_pipeline === stage)
    const revenue = stageLeads.reduce((sum, l) => sum + (l.valore ?? 0), 0)
    return { stage, count: stageLeads.length, revenue }
  })

  // Conversione per origine (coorte apertura, stesso principio di conversioneLeadRate).
  // I lead senza origine restano esclusi dal grafico, come nel comportamento precedente.
  const conversionePerOrigine = performanceByKey(allLeads.filter(l => l.origine), l => l.origine)
    .sort((a, b) => b.tasso - a.tasso)

  const conversionChartData = conversionePerOrigine.map(({ key, tasso }) => ({
    origine: key,
    tassoVinti: tasso,
    tassoNonVinti: 100 - tasso,
    tasso,
  }))

  // Performance owner (coorte apertura). A differenza di conversionePerOrigine, i lead
  // senza owner finiscono nel bucket "N/D" — stessa convenzione del grafico "Lead per owner".
  const performancePerOwner = performanceByKey(allLeads, l => l.owner).sort((a, b) => b.tasso - a.tasso)
  const ownerConversionChartData = performancePerOwner.map(({ key, tasso }) => ({
    owner: key,
    tassoVinti: tasso,
    tassoNonVinti: 100 - tasso,
    tasso,
  }))
```

**Nota per l'implementatore:** rimuovi anche il vecchio blocco `const leadsByOrigine: Record<string, number> = {}` con il suo `for` loop (subito sopra il blocco che stai sostituendo) — non è più usato, sostituito da `performanceByKey`. Verifica con una ricerca testuale che `leadsByOrigine` non compaia più nel file dopo questa modifica.

- [ ] **Step 3: Aggiungi `stato` a `slimLeads`**

Nel blocco `const slimLeads: SlimLead[] = allLeadsRaw.map(l => ({ ... }))`, aggiungi la riga `stato: l.stato,` subito dopo `stadio_pipeline: l.stadio_pipeline,`.

- [ ] **Step 4: Aggiorna la griglia delle StatsCard**

Sostituisci:

```tsx
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-7">
        <StatsCard title="Lead totali" value={allLeads.length} subtitle={`${openLeads.length} aperti`} icon={Users} color="blue" />
        <StatsCard title="Tasso conversione" value={`${conversionRate}%`} subtitle={`${wonLeads.length} vinti su ${allLeads.length}`} icon={TrendingUp} color="green" />
        <StatsCard title="Fatturato vinti" value={`€${totalRevenue.toLocaleString('it-IT')}`} subtitle={`${wonLeads.length} deal chiusi`} icon={Euro} color="green" />
        <StatsCard title="Pipeline aperta" value={`€${pipelineValue.toLocaleString('it-IT')}`} subtitle={`${openLeads.filter(l => l.valore).length} deal con valore`} icon={Target} color="blue" />
        <StatsCard title="Giorni medi chiusura" value={avgDaysToClose} icon={Clock} color="amber" />
        <StatsCard title="Scaduti follow-up" value={overdue.length} subtitle={`soglia: ${settings.followup_threshold_days}gg`} icon={AlertCircle} color="red" />
        <StatsCard title="Tasso no-show" value={`${noShowRate}%`} subtitle={`${nonPresentati} su ${nonPresentati + effettuati} appuntamenti`} icon={CalendarX} color="red" />
      </div>
```

con:

```tsx
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatsCard title="Lead totali" value={allLeads.length} subtitle={`${openLeads.length} aperti`} icon={Users} color="blue" />
        <StatsCard title="Conversione lead" value={`${conversioneLeadRate}%`} subtitle={`${leadWonToday} vinti su ${allLeads.length} aperti`} icon={TrendingUp} color="green" />
        <StatsCard title="Win rate" value={`${winRate}%`} subtitle={`${winVinti} vinti su ${closedDecisive.length} chiusi`} icon={Award} color="green" />
        <StatsCard title="Fatturato vinti" value={`€${totalRevenue.toLocaleString('it-IT')}`} subtitle={`${wonLeads.length} deal chiusi`} icon={Euro} color="green" />
        <StatsCard title="Pipeline aperta" value={`€${pipelineValue.toLocaleString('it-IT')}`} subtitle={`${openLeads.filter(l => l.valore).length} deal con valore`} icon={Target} color="blue" />
        <StatsCard title="Forecast pesato" value={`€${Math.round(forecastPesato).toLocaleString('it-IT')}`} subtitle="pipeline × probabilità stadio" icon={Gauge} color="amber" />
        <StatsCard title="Giorni medi chiusura" value={avgDaysToClose} icon={Clock} color="amber" />
        <StatsCard title="Lead a rischio" value={rischio.length} subtitle={`fermi da ${settings.followup_threshold_days}+ gg`} icon={AlertCircle} color="red" />
        <StatsCard title="Tasso no-show" value={`${noShowRate}%`} subtitle={`${nonPresentati} su ${nonPresentati + effettuati} appuntamenti`} icon={CalendarX} color="red" />
        <StatsCard title="Scheduling→chiusura" value={`${schedulingToCloseRateValue}%`} subtitle={`${schedVinti} vinti su ${schedTotale} effettuati`} icon={CalendarCheck} color="green" />
      </div>
```

- [ ] **Step 5: Passa le nuove props a `ChartsSection`**

Nel blocco `<ChartsSection ... />`, aggiungi `ownerConversionChartData={ownerConversionChartData}` ed `esitiChartData={esitiChartData}` accanto a `appuntamentoChartData={appuntamentoChartData}`.

- [ ] **Step 6: Sostituisci la sezione "Da ricontattare" (basata su `overdue`) con "Lead a rischio"**

Sostituisci:

```tsx
      {overdue.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <h2 className="font-semibold text-orange-800 mb-3">Da ricontattare ({overdue.length})</h2>
          <div className="space-y-1">
            {overdue.slice(0, 10).map(lead => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="flex justify-between text-sm hover:underline">
                <span>{lead.nome} {lead.cognome} — {lead.azienda}</span>
                <span className="text-orange-600">{lead.giorni_ultimo_contatto}gg fa</span>
              </Link>
            ))}
          </div>
        </div>
      )}
```

con:

```tsx
      {rischio.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <h2 className="font-semibold text-orange-800 mb-3">Lead a rischio ({rischio.length})</h2>
          <div className="space-y-1">
            {rischio.slice(0, 10).map(({ lead, giorni, maiContattato }) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="flex justify-between text-sm hover:underline">
                <span>{lead.nome} {lead.cognome} — {lead.azienda}</span>
                <span className="text-orange-600">{maiContattato ? `mai contattato, ${giorni}gg` : `${giorni}gg fa`}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
```

- [ ] **Step 7: Verifica che il progetto compili**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 8: Run full test suite**

Run: `npm test`
Expected: PASS, 0 failures

- [ ] **Step 9: Verifica manuale nel browser**

Con `npm run dev` attivo, apri `/dashboard`: verifica che le 10 card mostrino valori sensati (non NaN/undefined), che i due nuovi grafici ("Performance owner", "Distribuzione esiti") rendano dati, che il click su una barra apra il modal con i lead filtrati corretti, e che la sezione "Lead a rischio" mostri sia lead con contatto sia lead mai contattati con etichette diverse.

- [ ] **Step 10: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: rewire dashboard KPIs onto consistent open/closed cohorts"
```

---

## Nota post-merge

Dopo il merge, tutte le probabilità di stadio partono a `0` (nessun default indovinato — vedi Global Constraints). Il forecast pesato mostrerà `€0` finché non vengono configurate manualmente in Settings → "Probabilità di chiusura per stadio".
