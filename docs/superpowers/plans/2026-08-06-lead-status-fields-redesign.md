# Lead Status Fields Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redefine the three overlapping/dead `leads` columns (`stadio_pipeline`, `stato_lead`, `stato`) so each has a distinct, enum-constrained role, and rewire every place that computes "active/dormant/won/lost" to read the right field — so the CRM can finally answer "where does a lead die, stall, or continue."

**Architecture:** No new tables/columns. `stadio_pipeline` becomes a 4-value funnel position with no terminal states (frozen at last value reached on close). `stato` becomes an 8-value outcome/health field and is the new source of truth for won/lost/active/dormant logic. `stato_lead` stays a manual, independent 4-value field. Existing data is migrated via a reviewed dry-run script before any DB constraint is added; application code changes are separate from the data migration so they can be built and unit-tested without touching production data.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres), TypeScript, Vitest, shadcn/ui Select.

## Global Constraints

- This is a customized Next.js — read `node_modules/next/dist/docs/` before touching routing/data-fetching conventions; don't assume standard Next.js behavior.
- Repo lives under iCloud-synced Desktop: if `node_modules` gets evicted, `vitest`/`git` fail with `mmap ETIMEDOUT` / `write error: Operation timed out`. If a step fails that way, the fix is `rm -rf node_modules && npm ci`, not debugging the test.
- Ignore every file/dir with a ` 2` suffix in this repo (e.g. `app 2/`, `lib 2/`, `PROJECT_DOC 2.md`) — untracked accidental duplicates, not part of the real codebase.
- Test command: `npm test` (= `vitest run`).
- Any step that writes to the live Supabase database (Tasks 9 and 10) is **gated**: present the dry-run/plan output to the user and get explicit go-ahead before running the write. Never run `--apply` or push a schema migration unattended.
- **Deployment order:** the spec requires data to be migrated before the new code is live in production, to avoid a window where the UI expects the new vocabulary but the DB still holds old values. Tasks 1–8 (code) can be implemented, unit-tested, and committed locally in order — but do not `git push` to `main` (or otherwise trigger a Vercel deploy) until Task 9 (data migration `--apply`) and Task 10 (CHECK constraints) have both been applied to the production Supabase project. If this repo's `main` auto-deploys on push, keep the branch unpushed/local until then, or hold the PR, and say so explicitly rather than pushing incrementally per task.

---

## Task 1: Redefine stadio/stato constants in `types/index.ts`

**Files:**
- Modify: `types/index.ts:73-87` (stage constants block), `types/index.ts:126` (`STATO_LEAD_OPTIONS`)

**Interfaces:**
- Produces: `DEFAULT_PIPELINE_STAGES: string[]` (4 values, no terminal states), `STATO_OPTIONS: string[]` (8 values), `STATO_TERMINALI: string[]` (5 terminal `stato` values), `STATO_LEAD_OPTIONS: string[]` (4 values, adds `'Cliente'`). These are consumed by Tasks 2–5.
- Removes: `CLOSED_STAGES`, `ACTIVE_STAGE_EXCLUSIONS` (no longer meaningful once `stadio_pipeline` has no terminal states).

- [ ] **Step 1: Replace the stage/closed-stage constants**

Replace `types/index.ts:73-87`:

```typescript
export const DEFAULT_PIPELINE_STAGES = [
  'Lead In',
  'Discovery',
  'Proposal Sent',
  'Chiuso (Vinto)',
  'Chiuso (Perso)',
  'Cliente',
  'Studente',
]

export const CLOSED_STAGES = ['Chiuso (Vinto)', 'Chiuso (Perso)']

// Stadi che non rappresentano un deal in corso: esclusi dal task feed.
// 'Cliente' e 'Studente' non sono chiusure, ma non c'è nulla da lavorare.
export const ACTIVE_STAGE_EXCLUSIONS = [...CLOSED_STAGES, 'Cliente', 'Studente']
```

with:

```typescript
// Stadio: posizione nel funnel prima della chiusura. Nessuno stato terminale
// qui: l'esito (vinto/perso/cliente/...) vive in `stato`. Quando `stato`
// diventa terminale, `stadio_pipeline` resta congelato all'ultimo valore
// raggiunto (dice fin dove è arrivato il lead prima di fermarsi).
export const DEFAULT_PIPELINE_STAGES = [
  'Lead In',
  'Discovery',
  'Proposal Sent',
  'Proposal Signed',
]

// Stato: esito/stato dettagliato del lead. Guida le metriche
// won/lost/attivo/dormiente — è l'unico campo che la logica di business legge.
export const STATO_OPTIONS = [
  'In corso',
  'In chiusura',
  'Rimandato',
  'Vinto',
  'Perso',
  'Cliente',
  'Non qualificato',
  'Studente',
]

// Valori terminali di `stato`: il lead non è più lavorabile.
export const STATO_TERMINALI = ['Vinto', 'Perso', 'Cliente', 'Non qualificato', 'Studente']
```

- [ ] **Step 2: Add `Cliente` to `STATO_LEAD_OPTIONS`**

Replace `types/index.ts:126`:

```typescript
export const STATO_LEAD_OPTIONS = ['Attivo', 'In Attesa', 'Chiuso']
```

with:

```typescript
export const STATO_LEAD_OPTIONS = ['Attivo', 'In Attesa', 'Chiuso', 'Cliente']
```

- [ ] **Step 3: Verify no other file still imports the removed constants**

Run: `grep -rn "CLOSED_STAGES\|ACTIVE_STAGE_EXCLUSIONS" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v "/\.next/" | grep -v " 2/"`
Expected: no matches (Tasks 2 and 3 remove the remaining usages — if this step runs before those tasks, matches in `lib/tasks.ts`, `app/dashboard/page.tsx`, `app/leads/page.tsx`, `app/api/cron/reminders/route.ts` are expected and will be fixed by those tasks; just confirm the list matches exactly those 4 files).

- [ ] **Step 4: Commit**

```bash
git add types/index.ts
git commit -m "feat: redefine stadio_pipeline/stato vocabularies, add Cliente to stato_lead"
```

---

## Task 2: Rewire `isActiveLead`/`advancedStages` to read `stato` (TDD)

**Files:**
- Modify: `lib/tasks.ts:1,19-33`
- Test: `lib/tasks.test.ts:44-74`

**Interfaces:**
- Consumes: `STATO_TERMINALI: string[]` from Task 1.
- Produces: `isActiveLead(lead: LeadWithComputed): boolean` (same signature, new implementation — reads `lead.stato` instead of `lead.stadio_pipeline`), `advancedStages(pipelineStages: string[]): string[]` (same signature, no longer filters out closed stages since none exist in `pipelineStages` anymore). Both are consumed by the rest of `lib/tasks.ts` (`buildDaFareOra`, `isClosingSoon`, `buildDormienti`, etc.) — unchanged callers, no ripple beyond this file.

- [ ] **Step 1: Write the failing tests**

Replace `lib/tasks.test.ts:44-74`:

```typescript
describe('isActiveLead', () => {
  it('treats a lead with no stato as active (not yet closed)', () => {
    expect(isActiveLead(makeLead({ stato: null }))).toBe(true)
  })

  it('accepts open stato values', () => {
    expect(isActiveLead(makeLead({ stato: 'In corso' }))).toBe(true)
    expect(isActiveLead(makeLead({ stato: 'In chiusura' }))).toBe(true)
    expect(isActiveLead(makeLead({ stato: 'Rimandato' }))).toBe(true)
  })

  it('rejects terminal stato values', () => {
    expect(isActiveLead(makeLead({ stato: 'Vinto' }))).toBe(false)
    expect(isActiveLead(makeLead({ stato: 'Perso' }))).toBe(false)
    expect(isActiveLead(makeLead({ stato: 'Cliente' }))).toBe(false)
    expect(isActiveLead(makeLead({ stato: 'Non qualificato' }))).toBe(false)
    expect(isActiveLead(makeLead({ stato: 'Studente' }))).toBe(false)
  })
})

describe('advancedStages', () => {
  it('returns the last third of the pipeline stages', () => {
    const stages = ['Lead In', 'Discovery', 'Proposal Sent', 'Proposal Signed']
    expect(advancedStages(stages)).toEqual(['Proposal Signed'])
  })

  it('scales with a longer pipeline', () => {
    const stages = ['A', 'B', 'C', 'D', 'E', 'F']
    expect(advancedStages(stages)).toEqual(['E', 'F'])
  })

  it('returns at least one stage', () => {
    expect(advancedStages(['Solo'])).toEqual(['Solo'])
  })

  it('returns empty for an empty pipeline', () => {
    expect(advancedStages([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- lib/tasks.test.ts`
Expected: FAIL — `isActiveLead`/`advancedStages` still reference the removed `ACTIVE_STAGE_EXCLUSIONS` import (Task 1 already removed it from `types/index.ts`), so this should fail with an import/type error or wrong assertions.

- [ ] **Step 3: Implement**

Replace `lib/tasks.ts:1`:

```typescript
import { ACTIVE_STAGE_EXCLUSIONS, parseLocalDate } from '@/types'
```

with:

```typescript
import { STATO_TERMINALI, parseLocalDate } from '@/types'
```

Replace `lib/tasks.ts:19-33`:

```typescript
/** Un lead è "lavorabile": non chiuso, non già cliente/studente. */
export function isActiveLead(lead: LeadWithComputed): boolean {
  return !ACTIVE_STAGE_EXCLUSIONS.includes(lead.stadio_pipeline)
}

/**
 * Gli stadi "avanzati" = ultimo terzo degli stadi lavorabili configurati.
 * Gli stadi sono editabili da settings, quindi non possono essere hardcoded.
 */
export function advancedStages(pipelineStages: string[]): string[] {
  const active = pipelineStages.filter(s => !ACTIVE_STAGE_EXCLUSIONS.includes(s))
  if (active.length === 0) return []
  const count = Math.max(1, Math.ceil(active.length / 3))
  return active.slice(-count)
}
```

with:

```typescript
/** Un lead è "lavorabile": stato non ancora terminale (null = non ancora chiuso). */
export function isActiveLead(lead: LeadWithComputed): boolean {
  return !STATO_TERMINALI.includes(lead.stato ?? '')
}

/**
 * Gli stadi "avanzati" = ultimo terzo degli stadi pipeline configurati.
 * Gli stadi sono editabili da settings, quindi non possono essere hardcoded.
 */
export function advancedStages(pipelineStages: string[]): string[] {
  if (pipelineStages.length === 0) return []
  const count = Math.max(1, Math.ceil(pipelineStages.length / 3))
  return pipelineStages.slice(-count)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/tasks.test.ts`
Expected: PASS (all tests in the file, including the untouched `buildDaFareOra`/`buildInArrivo`/`buildDormienti`/`buildProssimiChiusura` suites — these call `isActiveLead` internally with `makeLead()` defaults where `stato: null`, which is now "active", matching their prior behavior since `baseLead.stadio_pipeline: 'Discovery'` was also non-terminal before).

- [ ] **Step 5: Commit**

```bash
git add lib/tasks.ts lib/tasks.test.ts
git commit -m "feat: isActiveLead/advancedStages read stato instead of stadio_pipeline"
```

---

## Task 3: Rewire won/open/active-lead queries to use `stato`

**Files:**
- Modify: `app/dashboard/page.tsx:6,68,70-72`
- Modify: `app/leads/page.tsx:10,65`
- Modify: `app/api/cron/reminders/route.ts:5,16`

**Interfaces:**
- Consumes: `STATO_TERMINALI: string[]` from Task 1.

- [ ] **Step 1: Dashboard KPIs**

Replace `app/dashboard/page.tsx:6`:

```typescript
import { computeLeadFields, CLOSED_STAGES } from '@/types'
```

with:

```typescript
import { computeLeadFields, STATO_TERMINALI } from '@/types'
```

Replace `app/dashboard/page.tsx:68`:

```typescript
  const openLeads = baseLeads.filter(l => !CLOSED_STAGES.includes(l.stadio_pipeline))
```

with:

```typescript
  const openLeads = baseLeads.filter(l => !STATO_TERMINALI.includes(l.stato ?? ''))
```

Replace `app/dashboard/page.tsx:70-72`:

```typescript
  const wonLeads = baseLeads.filter(l =>
    l.stadio_pipeline === 'Chiuso (Vinto)' && filterByDate(l, l.data_chiusura)
  )
```

with:

```typescript
  const wonLeads = baseLeads.filter(l =>
    l.stato === 'Vinto' && filterByDate(l, l.data_chiusura)
  )
```

- [ ] **Step 2: Leads list "attivi" count**

Replace `app/leads/page.tsx:10`:

```typescript
import { CLOSED_STAGES } from '@/types'
```

with:

```typescript
import { STATO_TERMINALI } from '@/types'
```

Replace `app/leads/page.tsx:65` (note: `NOT IN` excludes NULL rows in Postgres, so a plain `.not(...)` would wrongly drop leads with `stato IS NULL` — use `.or()` so null-stato leads still count as active):

```typescript
    supabase.from('leads').select('*', { count: 'exact', head: true }).not('stadio_pipeline', 'in', `(${CLOSED_STAGES.map(s => `"${s}"`).join(',')})`),
```

with:

```typescript
    supabase.from('leads').select('*', { count: 'exact', head: true }).or(`stato.is.null,stato.not.in.(${STATO_TERMINALI.map(s => `"${s}"`).join(',')})`),
```

- [ ] **Step 3: Cron reminders — same null-safety fix**

Replace `app/api/cron/reminders/route.ts:5`:

```typescript
import { computeLeadFields, CLOSED_STAGES } from '@/types'
```

with:

```typescript
import { computeLeadFields, STATO_TERMINALI } from '@/types'
```

Replace `app/api/cron/reminders/route.ts:16`:

```typescript
    supabase.from('leads').select('*').not('stadio_pipeline', 'in', `(${CLOSED_STAGES.map(s => `"${s}"`).join(',')})`),
```

with:

```typescript
    supabase.from('leads').select('*').or(`stato.is.null,stato.not.in.(${STATO_TERMINALI.map(s => `"${s}"`).join(',')})`),
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: no type errors referencing `CLOSED_STAGES` or `ACTIVE_STAGE_EXCLUSIONS`.

Run: `grep -rn "CLOSED_STAGES\|ACTIVE_STAGE_EXCLUSIONS" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v "/\.next/" | grep -v " 2/"`
Expected: no matches at all now (this closes out the check deferred from Task 1 Step 3).

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/page.tsx app/leads/page.tsx app/api/cron/reminders/route.ts
git commit -m "feat: won/open/active-lead queries read stato instead of stadio_pipeline"
```

---

## Task 4: Exclude closed leads (terminal `stato`) from the Kanban board

**Files:**
- Modify: `app/pipeline/page.tsx`

**Interfaces:**
- Consumes: `isActiveLead(lead: LeadWithComputed): boolean` from `lib/tasks.ts` (Task 2).

Why this task exists: `stadio_pipeline` no longer has terminal states — a won/lost/client/student lead just freezes at whatever stage it last reached (e.g. `'Proposal Sent'`) and stays there forever. Previously, `Vinto`/`Perso` were themselves Kanban columns (from the old `settings.pipeline_stages` seed), so closed deals were visually separated; `Cliente`/`Studente` leads simply didn't match any of the seeded columns and silently didn't render. With only 4 non-terminal columns now, an unfiltered board would accumulate every closed deal inside whichever column it froze at, permanently cluttering the "Proposal Sent" column with old business — exactly the kind of noise that makes it hard to see where live leads are stalling, which is the whole point of this redesign. The board should only ever show leads that are still being worked.

- [ ] **Step 1: Filter to active leads before passing to `KanbanBoard`**

Replace `app/pipeline/page.tsx`:

```typescript
export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields } from '@/types'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'

export default async function PipelinePage() {
  const supabase = createServiceClient()
  const [{ data: leads }, settings] = await Promise.all([
    supabase.from('leads').select('*'),
    getSettings(),
  ])

  const computed = (leads ?? []).map(l => computeLeadFields(l))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pipeline</h1>
      <KanbanBoard
        initialLeads={computed}
        stages={settings.pipeline_stages}
        threshold={settings.followup_threshold_days}
      />
    </div>
  )
}
```

with:

```typescript
export const dynamic = 'force-dynamic'

import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields } from '@/types'
import { isActiveLead } from '@/lib/tasks'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'

export default async function PipelinePage() {
  const supabase = createServiceClient()
  const [{ data: leads }, settings] = await Promise.all([
    supabase.from('leads').select('*'),
    getSettings(),
  ])

  const computed = (leads ?? []).map(l => computeLeadFields(l)).filter(isActiveLead)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pipeline</h1>
      <KanbanBoard
        initialLeads={computed}
        stages={settings.pipeline_stages}
        threshold={settings.followup_threshold_days}
      />
    </div>
  )
}
```

- [ ] **Step 2: Apply the same filter to the Kanban board's polling refetch**

`components/kanban/KanbanBoard.tsx:68-82` polls `GET /api/leads` every 30s and replaces the board's lead list wholesale with the response. That endpoint (`app/api/leads/route.ts`) currently returns every lead unfiltered, so the polling would silently re-introduce closed leads 30 seconds after the initial filtered load from Task 4 Step 1. `GET /api/leads` has exactly one consumer in the codebase — `KanbanBoard.tsx`'s `fetch('/api/leads')` (confirmed via `grep -rn "fetch('/api/leads'" --include="*.tsx" --include="*.ts" .` — `LeadForm.tsx` posts to the same path but that's the `POST` handler, unaffected) — so it's safe to filter its `GET` handler by default rather than adding a query-param toggle for a caller that doesn't exist yet.

Replace `app/api/leads/route.ts:1-24`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { computeLeadFields } from '@/types'
import { pickLeadFields } from '@/lib/lead-fields'
import { sanitizeSearchTerm } from '@/lib/search'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const stage = searchParams.get('stage')
  const origine = searchParams.get('origine')
  const q = sanitizeSearchTerm(searchParams.get('q'))

  const supabase = createServiceClient()
  let query = supabase.from('leads').select('*').order('created_at', { ascending: false })

  if (stage) query = query.eq('stadio_pipeline', stage)
  if (origine) query = query.eq('origine', origine)
  if (q) query = query.or(`nome.ilike.%${q}%,cognome.ilike.%${q}%,azienda.ilike.%${q}%,email.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json((data ?? []).map(l => computeLeadFields(l)))
}
```

with:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { computeLeadFields } from '@/types'
import { pickLeadFields } from '@/lib/lead-fields'
import { sanitizeSearchTerm } from '@/lib/search'
import { isActiveLead } from '@/lib/tasks'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const stage = searchParams.get('stage')
  const origine = searchParams.get('origine')
  const q = sanitizeSearchTerm(searchParams.get('q'))

  const supabase = createServiceClient()
  let query = supabase.from('leads').select('*').order('created_at', { ascending: false })

  if (stage) query = query.eq('stadio_pipeline', stage)
  if (origine) query = query.eq('origine', origine)
  if (q) query = query.or(`nome.ilike.%${q}%,cognome.ilike.%${q}%,azienda.ilike.%${q}%,email.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const activeLeads = (data ?? []).map(l => computeLeadFields(l)).filter(isActiveLead)
  return NextResponse.json(activeLeads)
}
```

(`POST` below is unchanged — leave it as-is.)

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `/pipeline`. Create or edit a lead (via `/leads/new` or the edit drawer) with Stato = Vinto. Confirm it does NOT appear in any Kanban column. Confirm leads with Stato empty/In corso/In chiusura/Rimandato still appear normally. Wait 30+ seconds on the pipeline page (or trigger a window focus) to confirm the polling refetch doesn't re-add the closed lead.

- [ ] **Step 4: Commit**

```bash
git add app/pipeline/page.tsx app/api/leads/route.ts
git commit -m "feat: exclude leads with terminal stato from the Kanban board and its polling refetch"
```

---

## Task 5: `LeadForm` — `stato` as Select, conditional `motivo_lost`, `stato_lead` picks up `Cliente`

**Files:**
- Modify: `components/leads/LeadForm.tsx:12,239-240`

**Interfaces:**
- Consumes: `STATO_OPTIONS: string[]` from Task 1 (new import). `STATO_LEAD_OPTIONS` already imported — automatically renders the new `Cliente` option added in Task 1 with no further change.

- [ ] **Step 1: Import `STATO_OPTIONS`**

Replace `components/leads/LeadForm.tsx:12`:

```typescript
import { DEFAULT_PIPELINE_STAGES, ESPERIENZA_US_OPTIONS, ORIGINE_OPTIONS, INDUSTRY_OPTIONS, STATO_LEAD_OPTIONS, DIPENDENTI_OPTIONS } from '@/types'
```

with:

```typescript
import { DEFAULT_PIPELINE_STAGES, ESPERIENZA_US_OPTIONS, ORIGINE_OPTIONS, INDUSTRY_OPTIONS, STATO_LEAD_OPTIONS, STATO_OPTIONS, DIPENDENTI_OPTIONS } from '@/types'
```

- [ ] **Step 2: Replace the free-text `stato`/`motivo_lost` fields**

Replace `components/leads/LeadForm.tsx:239-240`:

```typescript
          <Field label="Stato" name="stato" form={form} set={set} />
          <Field label="Motivo lost" name="motivo_lost" form={form} set={set} />
```

with:

```typescript
          <div className="space-y-1">
            <Label>Stato</Label>
            <Select value={form.stato ?? ''} onValueChange={v => set('stato', v ?? '')}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {STATO_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {form.stato === 'Perso' && (
            <Field label="Motivo lost" name="motivo_lost" form={form} set={set} />
          )}
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/leads/new`.
Expected: "Pipeline" section shows a "Stato" dropdown with the 8 `STATO_OPTIONS` values; "Motivo lost" field is hidden by default and appears only after selecting "Perso" in Stato; "Stato lead" dropdown now includes "Cliente".

- [ ] **Step 4: Commit**

```bash
git add components/leads/LeadForm.tsx
git commit -m "feat: stato as Select in LeadForm, motivo_lost shown only when stato=Perso"
```

---

## Task 6: Centralize stage/stato badge colors, add outcome badge to list + detail views

**Files:**
- Create: `lib/stage-colors.ts`
- Modify: `components/leads/LeadTable.tsx:16-24,94-98`
- Modify: `components/ui/SearchModal.tsx:6-14`
- Modify: `components/dashboard/PipelineChart.tsx:7-15,50`
- Modify: `app/leads/[id]/page.tsx:13-21,39,62-65`

**Interfaces:**
- Produces: `STAGE_BADGE_CLASSES: Record<string, string>` (4 keys, Tailwind classes for `stadio_pipeline`), `STAGE_CHART_COLORS: Record<string, string>` (4 keys, hex for Recharts), `STATO_BADGE_CLASSES: Record<string, string>` (8 keys, Tailwind classes for `stato`). Consumed by the 4 files below.

Why this task exists: the old `STAGE_COLORS` map was duplicated identically in 4 files and keyed on the old 7-value `stadio_pipeline` vocabulary (including the terminal states removed in Task 1). All 4 must be touched to stop rendering a gray fallback badge for every lead, so centralizing them costs nothing extra. Terminal-state color information (green for Vinto, red for Perso, etc.) that used to live on the stage badge now needs to live on a `stato` badge instead, or that visual signal disappears — added to the two views where leads are reviewed in bulk (list, detail).

- [ ] **Step 1: Create the shared color module**

Create `lib/stage-colors.ts`:

```typescript
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
```

- [ ] **Step 2: `LeadTable.tsx` — shared stage badge + new stato badge**

Replace `components/leads/LeadTable.tsx:16-24`:

```typescript
const STAGE_COLORS: Record<string, string> = {
  'Lead In':        'bg-blue-100 text-blue-700',
  'Discovery':      'bg-violet-100 text-violet-700',
  'Proposal Sent':  'bg-amber-100 text-amber-700',
  'Chiuso (Vinto)': 'bg-green-100 text-green-700',
  'Chiuso (Perso)': 'bg-red-100 text-red-700',
  'Cliente':        'bg-emerald-100 text-emerald-700',
  'Studente':       'bg-gray-100 text-gray-600',
}
```

with:

```typescript
import { STAGE_BADGE_CLASSES, STATO_BADGE_CLASSES } from '@/lib/stage-colors'
```

(place this import alongside the other imports at the top of the file, not inline where the const was — remove the old const block entirely.)

Replace `components/leads/LeadTable.tsx:94-98`:

```typescript
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[lead.stadio_pipeline] ?? 'bg-gray-100 text-gray-600'}`}>
                    {lead.stadio_pipeline}
                  </span>
                </td>
```

with:

```typescript
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_BADGE_CLASSES[lead.stadio_pipeline] ?? 'bg-gray-100 text-gray-600'}`}>
                      {lead.stadio_pipeline}
                    </span>
                    {lead.stato && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATO_BADGE_CLASSES[lead.stato] ?? 'bg-gray-100 text-gray-600'}`}>
                        {lead.stato}
                      </span>
                    )}
                  </div>
                </td>
```

- [ ] **Step 3: `SearchModal.tsx` — shared stage badge**

Replace `components/ui/SearchModal.tsx:6-14`:

```typescript
const STAGE_COLORS: Record<string, string> = {
  'Lead In':        'bg-blue-100 text-blue-700',
  'Discovery':      'bg-violet-100 text-violet-700',
  'Proposal Sent':  'bg-amber-100 text-amber-700',
  'Chiuso (Vinto)': 'bg-green-100 text-green-700',
  'Chiuso (Perso)': 'bg-red-100 text-red-700',
  'Cliente':        'bg-emerald-100 text-emerald-700',
  'Studente':       'bg-gray-100 text-gray-600',
}
```

with:

```typescript
import { STAGE_BADGE_CLASSES } from '@/lib/stage-colors'
```

(again: place with the other imports, remove the old const, and replace every `STAGE_COLORS[...]` reference later in the file — there is exactly one, at `components/ui/SearchModal.tsx:131` — with `STAGE_BADGE_CLASSES[...]`.)

- [ ] **Step 4: `PipelineChart.tsx` — shared chart colors**

Replace `components/dashboard/PipelineChart.tsx:7-15`:

```typescript
const STAGE_COLORS: Record<string, string> = {
  'Lead In':        '#6366f1',
  'Discovery':      '#8b5cf6',
  'Proposal Sent':  '#f59e0b',
  'Chiuso (Vinto)': '#10b981',
  'Chiuso (Perso)': '#ef4444',
  'Cliente':        '#059669',
  'Studente':       '#9ca3af',
}
```

with:

```typescript
import { STAGE_CHART_COLORS } from '@/lib/stage-colors'
```

(place with the other imports; then update `components/dashboard/PipelineChart.tsx:50`:)

```typescript
            <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] ?? '#6366f1'} />
```

becomes:

```typescript
            <Cell key={entry.stage} fill={STAGE_CHART_COLORS[entry.stage] ?? '#6366f1'} />
```

- [ ] **Step 5: `app/leads/[id]/page.tsx` — shared stage badge + new stato badge**

Replace `app/leads/[id]/page.tsx:13-21`:

```typescript
const STAGE_COLORS: Record<string, string> = {
  'Lead In':        'bg-blue-100 text-blue-700',
  'Discovery':      'bg-violet-100 text-violet-700',
  'Proposal Sent':  'bg-amber-100 text-amber-700',
  'Chiuso (Vinto)': 'bg-green-100 text-green-700',
  'Chiuso (Perso)': 'bg-red-100 text-red-700',
  'Cliente':        'bg-emerald-100 text-emerald-700',
  'Studente':       'bg-gray-100 text-gray-600',
}
```

with:

```typescript
import { STAGE_BADGE_CLASSES, STATO_BADGE_CLASSES } from '@/lib/stage-colors'
```

Update `app/leads/[id]/page.tsx:39`:

```typescript
  const stageClass = STAGE_COLORS[computed.stadio_pipeline] ?? 'bg-gray-100 text-gray-600'
```

becomes:

```typescript
  const stageClass = STAGE_BADGE_CLASSES[computed.stadio_pipeline] ?? 'bg-gray-100 text-gray-600'
```

Replace `app/leads/[id]/page.tsx:62-65`:

```typescript
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stageClass}`}>
                {computed.stadio_pipeline}
              </span>
```

with:

```typescript
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stageClass}`}>
                {computed.stadio_pipeline}
              </span>
              {computed.stato && (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATO_BADGE_CLASSES[computed.stato] ?? 'bg-gray-100 text-gray-600'}`}>
                  {computed.stato}
                </span>
              )}
```

- [ ] **Step 6: Verify build and run full test suite**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors, all tests pass (this task touches no logic covered by `lib/tasks.test.ts`, just presentation).

- [ ] **Step 7: Manual verification**

Run: `npm run dev`. Open `/leads` — stage badges show the 4 new colors, no lead shows a gray fallback badge; a lead with `stato` set shows a second small badge. Open a lead detail page — same two badges appear in the header. Open `/dashboard` — pipeline chart bars are colored per stage.

- [ ] **Step 8: Commit**

```bash
git add lib/stage-colors.ts components/leads/LeadTable.tsx components/ui/SearchModal.tsx components/dashboard/PipelineChart.tsx "app/leads/[id]/page.tsx"
git commit -m "refactor: centralize stage badge colors, add stato outcome badge to list and detail views"
```

---

## Task 7: n8n webhook can write `stato`

**Files:**
- Modify: `lib/webhook-mapping.ts:6-27`

**Interfaces:**
- No new exports; extends the existing `INBOUND_FIELD_MAP` object consumed by `mapInboundPayload`.

- [ ] **Step 1: Add `stato` to the inbound field map**

Replace `lib/webhook-mapping.ts:21-22`:

```typescript
  stadio_pipeline: 'stadio_pipeline',
  stato_lead: 'stato_lead',
```

with:

```typescript
  stadio_pipeline: 'stadio_pipeline',
  stato_lead: 'stato_lead',
  stato: 'stato',
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/webhook-mapping.ts
git commit -m "feat: allow n8n inbound webhook to write stato"
```

Note for follow-up outside this repo: the n8n "Stage Auto-Updater" workflow currently decides and writes `stadio_pipeline` on Gmail replies. It should be updated to also decide `stato` (e.g. detect "not interested" replies → `Perso`), but that workflow lives in n8n, not in this codebase — out of scope for this plan.

---

## Task 8: Update pipeline_stages default + settings row (safe, non-destructive)

**Files:**
- Modify: `lib/settings.ts:11`
- Create: `supabase/migrations/004_pipeline_stages_update.sql`

**Interfaces:**
- No code-level interface change — `getSettings()` keeps returning `Settings { followup_threshold_days: number; pipeline_stages: string[] }`, just with updated values.

This is the first DB-touching step, but it only rewrites one row in the `settings` table (not `leads`), so it carries none of the data-loss risk of Tasks 9–10 — safe to apply directly.

- [ ] **Step 1: Update the in-code fallback default**

Replace `lib/settings.ts:11`:

```typescript
    pipeline_stages: JSON.parse(map['pipeline_stages'] ?? '["Lead In","Discovery","Proposal Sent","Chiuso (Vinto)","Chiuso (Perso)","Cliente","Studente"]'),
```

with:

```typescript
    pipeline_stages: JSON.parse(map['pipeline_stages'] ?? '["Lead In","Discovery","Proposal Sent","Proposal Signed"]'),
```

- [ ] **Step 2: Write the migration for the actual DB row**

Create `supabase/migrations/004_pipeline_stages_update.sql`:

```sql
-- supabase/migrations/004_pipeline_stages_update.sql
-- stadio_pipeline non contiene più stati terminali: l'esito vive in `stato`
-- (vedi 005_lead_status_constraints.sql, applicata dopo la migrazione dati).
UPDATE settings
SET value = '["Lead In","Discovery","Proposal Sent","Proposal Signed"]', updated_at = now()
WHERE key = 'pipeline_stages';
```

- [ ] **Step 3: Apply the migration**

Run this against the Supabase project (`supabase db push` if using the CLI with linked project, or paste into the Supabase SQL editor — check which workflow this repo already uses by looking for a `supabase/config.toml` or prior migration-apply instructions before picking one).
Expected: `settings` table row `pipeline_stages` now reads `["Lead In","Discovery","Proposal Sent","Proposal Signed"]`.

- [ ] **Step 4: Commit**

```bash
git add lib/settings.ts supabase/migrations/004_pipeline_stages_update.sql
git commit -m "feat: update pipeline_stages default and settings row to the 4-stage vocabulary"
```

---

## Task 9: Migrate existing `leads` rows to the new vocabulary (GATED — do not run `--apply` without user confirmation)

**Files:**
- Create: `scripts/migrate-lead-status.mjs`

**Interfaces:**
- Standalone script, no imports from the rest of the app (same pattern as `scripts/import-sheet.ts`: connects directly via `@supabase/supabase-js` with the service role key from `.env.local`).

This is the highest-risk step in the plan: it rewrites `stato` and `stadio_pipeline` on every row of the production `leads` table. The design spec requires a reviewed dry-run before any write. **Do not run with `--apply` in this task — stop after the dry-run and hand the output to the user for review; only run `--apply` in a later, explicit step once they confirm.**

- [ ] **Step 1: Back up the `leads` table**

Before running anything, get a full export of the current `leads` table (e.g. via the Supabase dashboard's Table Editor → Export CSV, or `supabase db dump` if the CLI is linked to the project). Save it outside the repo. Confirm the backup exists before proceeding — this is the safety net if the migration heuristic gets a row wrong.

- [ ] **Step 2: Write the migration script**

Create `scripts/migrate-lead-status.mjs`:

```javascript
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
```

- [ ] **Step 3: Run the dry run**

Run: `node scripts/migrate-lead-status.mjs`
Expected: prints every lead's old `stadio_pipeline` value and proposed new `stato`/`stadio_pipeline`, split into "da rivedere" (terminal old values — the new `stadio_pipeline` is a guess) and "mappatura diretta" (non-terminal old values — unambiguous). No writes happen. **STOP HERE and show this output to the user.**

- [ ] **Step 4: Get explicit user confirmation, then apply**

Do not proceed automatically. Once the user has reviewed the dry-run output (and, for any "da rivedere" row where the guessed `stadio_pipeline` is wrong, either accepted the guess or told you the correct value to hardcode into `STADIO_TO_NEW_STADIO`/a per-row override before rerunning), run:

`node scripts/migrate-lead-status.mjs --apply`

Expected: `Fatto. Aggiornati: N, falliti: 0` where N equals the total lead count. If `falliti` is non-zero, stop and report the per-row errors — do not proceed to Task 10's constraint migration with unresolved failures.

- [ ] **Step 5: Spot-check the result**

Run a quick count query (e.g. via Supabase SQL editor): `select stato, count(*) from leads group by stato order by count(*) desc;` and `select stadio_pipeline, count(*) from leads group by stadio_pipeline order by count(*) desc;`
Expected: `stato` values are all within `STATO_OPTIONS` (or null), `stadio_pipeline` values are all within the new 4-value list — this is the precondition for Task 10's CHECK constraints to apply cleanly.

- [ ] **Step 6: Commit the script**

```bash
git add scripts/migrate-lead-status.mjs
git commit -m "feat: add one-off migration script for leads stato/stadio_pipeline vocabulary"
```

---

## Task 10: Add CHECK constraints (GATED — run only after Task 9 is confirmed clean)

**Files:**
- Create: `supabase/migrations/005_lead_status_constraints.sql`

**Interfaces:**
- Pure schema migration, no code interface.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/005_lead_status_constraints.sql`:

```sql
-- supabase/migrations/005_lead_status_constraints.sql
-- Applicare SOLO dopo aver eseguito scripts/migrate-lead-status.mjs --apply
-- e verificato (Task 9 Step 5) che ogni riga sia nel nuovo vocabolario.

ALTER TABLE leads ALTER COLUMN stadio_pipeline SET DEFAULT 'Lead In';

ALTER TABLE leads
  ADD CONSTRAINT leads_stadio_pipeline_check
  CHECK (stadio_pipeline IN ('Lead In', 'Discovery', 'Proposal Sent', 'Proposal Signed'));

ALTER TABLE leads
  ADD CONSTRAINT leads_stato_lead_check
  CHECK (stato_lead IS NULL OR stato_lead IN ('Attivo', 'In Attesa', 'Chiuso', 'Cliente'));

ALTER TABLE leads
  ADD CONSTRAINT leads_stato_check
  CHECK (stato IS NULL OR stato IN ('In corso', 'In chiusura', 'Rimandato', 'Vinto', 'Perso', 'Cliente', 'Non qualificato', 'Studente'));
```

- [ ] **Step 2: Confirm precondition with the user**

Before applying, confirm Task 9 Step 5's spot-check showed clean data (every `stadio_pipeline`/`stato` value already within the new vocabularies). If any row is still out of range, this migration will fail outright (`ALTER TABLE ... ADD CONSTRAINT` validates existing rows) — fix those rows first rather than weakening the constraint.

- [ ] **Step 3: Apply the migration**

Run against the Supabase project the same way Task 8 Step 3 was applied (CLI `supabase db push` or SQL editor, whichever this repo's existing workflow uses).
Expected: migration succeeds with no constraint-violation error.

- [ ] **Step 4: Verify a bad write is now rejected**

Run (via SQL editor, on a throwaway/test row, or just inspect the constraint): attempt `UPDATE leads SET stato = 'bogus' WHERE id = '<any-id>';`
Expected: fails with a `check constraint "leads_stato_check"` violation. Do not leave this test update applied — it should fail, so there's nothing to roll back.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/005_lead_status_constraints.sql
git commit -m "feat: add CHECK constraints for stadio_pipeline/stato_lead/stato vocabularies"
```

---

## Task 11: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`
Expected: all tests pass, including the updated `lib/tasks.test.ts` suite from Task 2.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual walkthrough**

Run: `npm run dev`, then in the browser:
1. `/leads/new` — Stadio dropdown shows exactly `Lead In, Discovery, Proposal Sent, Proposal Signed`; Stato dropdown shows the 8 new values; Motivo lost is hidden until Stato = Perso; Stato lead dropdown includes Cliente. Create a lead with Stato = Perso, confirm Motivo lost becomes visible and saves.
2. `/pipeline` — Kanban board shows exactly 4 columns matching the new stages; drag a card between columns, confirm it persists (`stadio_pipeline` PATCH still works unchanged).
3. `/dashboard` — "Tasso conversione" and "Fatturato vinti" reflect leads with `stato = 'Vinto'`; "Pipeline aperta" excludes leads with a terminal `stato`.
4. `/leads` — list shows the recolored stage badge plus a second stato badge on leads that have one set; "Lead attivi" quick-stat count matches leads whose `stato` is null or non-terminal.
5. Open a lead detail page — header shows both badges.

- [ ] **Step 4: Report results to the user**

Summarize pass/fail for each of the 5 manual checks above plus the automated suite. If anything fails, stop and fix before considering this plan complete — do not report success without having actually run these checks.
