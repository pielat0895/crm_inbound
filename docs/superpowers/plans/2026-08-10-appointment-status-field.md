# Appointment Status Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `stato_appuntamento` field to `leads` (4 values: Non schedulato, Schedulato, Effettuato, Non presentato) — fully manual, independent of the existing `appuntamento` datetime field — surfaced in the lead form, list, detail page, filters, and two new dashboard metrics (no-show rate card + distribution chart).

**Architecture:** One new NOT NULL column with a DEFAULT and a CHECK constraint applied in a single migration (no legacy vocabulary to reconcile, unlike the prior `stadio_pipeline`/`stato` work — this is a brand new field). Every existing row gets the default automatically. Application code follows the exact patterns already established for `stato`/`stadio_pipeline`: a `*_OPTIONS` constant in `types/index.ts`, a badge/chart color map in `lib/stage-colors.ts`, a `<Select>` in `LeadForm`, a conditional badge in `LeadTable`/detail page, a URL-param filter in `LeadFilters`, and a bar chart in `ChartsSection` mirroring `PipelineChart`.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres), TypeScript, Vitest, shadcn/ui Select, Recharts.

## Global Constraints

- This is a customized Next.js — read `node_modules/next/dist/docs/` before touching routing/data-fetching conventions; don't assume standard Next.js behavior.
- Repo lives under iCloud-synced Desktop: if `node_modules` gets evicted, `vitest`/`git` fail with `mmap ETIMEDOUT` / `write error: Operation timed out`. If a step fails that way, the fix is `rm -rf node_modules && npm ci`, not debugging the test.
- Ignore every file/dir with a ` 2` suffix in this repo (e.g. `app 2/`, `lib 2/`, `PROJECT_DOC 2.md`) — untracked accidental duplicates, not part of the real codebase.
- Test command: `npm test` (= `vitest run`). Vitest is already configured to exclude `.claude/` (see `vitest.config.ts`) — if a worktree is created under `.claude/worktrees/` for this plan, test discovery will not pick up its nested copy.
- **No agent in this environment has direct Postgres DDL credentials** (only the Supabase REST/service-role key, which can run row-level `select`/`insert`/`update`/`delete` via `@supabase/supabase-js`, not `ALTER TABLE`). The migration in Task 2 must be created as a file and handed to the human to run manually via the Supabase SQL editor — do not attempt `supabase db push` or any other execution path.
- **Deployment order:** the migration (Task 2) must be applied to production before this branch's code is deployed — the new code reads/writes `stato_appuntamento` and will error at runtime against a database that doesn't have the column yet. Code tasks (1, 3–7) can be built and committed in any order; hold off on `git push`/deploy until Task 2's SQL has been confirmed applied.

---

## Task 1: Add `stato_appuntamento` to the type system

**Files:**
- Modify: `types/index.ts:1-35` (Lead type), `types/index.ts:137` (after `STATO_LEAD_OPTIONS`)
- Modify: `lib/lead-fields.ts:4-36` (`WRITABLE_LEAD_FIELDS`)
- Modify: `types/index.test.ts:5-14`, `lib/tasks.test.ts:8-18`, `__tests__/LeadForm.hideNote.test.tsx`, `__tests__/LeadForm.callbacks.test.tsx`, `__tests__/LeadEditDrawer.test.tsx`, `__tests__/LeadDetailTabs.test.tsx`, `__tests__/LeadTable.actions.test.tsx` — every test file that constructs a full `Lead` object literal needs the new required field or `tsc --noEmit` fails.

**Interfaces:**
- Produces: `Lead.stato_appuntamento: string` (NOT NULL, like `stadio_pipeline` — not `string | null`), `STATO_APPUNTAMENTO_OPTIONS: string[]` (4 values: `'Non schedulato'`, `'Schedulato'`, `'Effettuato'`, `'Non presentato'`). Consumed by Tasks 3–7.

This task has no independent test file of its own (it's a type/constant addition, same convention as `STATO_OPTIONS` in the prior plan) — its "test" is that the whole codebase still type-checks and the existing suite still passes with the new required field threaded through every fixture.

- [ ] **Step 1: Add the field to the `Lead` type**

Replace `types/index.ts:25`:

```typescript
  appuntamento: string | null
```

with:

```typescript
  appuntamento: string | null
  stato_appuntamento: string
```

- [ ] **Step 2: Add the options constant**

Replace `types/index.ts:137`:

```typescript
export const STATO_LEAD_OPTIONS = ['Attivo', 'In Attesa', 'Chiuso', 'Cliente']
```

with:

```typescript
export const STATO_LEAD_OPTIONS = ['Attivo', 'In Attesa', 'Chiuso', 'Cliente']

// Stato appuntamento: esito dell'appuntamento, indipendente dalla data/ora
// del campo `appuntamento` — sempre una scelta manuale, nessuna deduzione
// automatica dalla presenza o dal valore di quel campo.
export const STATO_APPUNTAMENTO_OPTIONS = ['Non schedulato', 'Schedulato', 'Effettuato', 'Non presentato']
```

- [ ] **Step 3: Add the field to writable columns**

Replace `lib/lead-fields.ts:26`:

```typescript
  'appuntamento',
```

with:

```typescript
  'appuntamento',
  'stato_appuntamento',
```

- [ ] **Step 4: Fix every test fixture that constructs a full `Lead` object**

Replace `types/index.test.ts:11`:

```typescript
  valore: null, owner: null, data_apertura: null, appuntamento: null,
```

with:

```typescript
  valore: null, owner: null, data_apertura: null, appuntamento: null, stato_appuntamento: 'Non schedulato',
```

Replace `lib/tasks.test.ts:14`:

```typescript
  valore: null, owner: null, data_apertura: null, appuntamento: null,
```

with:

```typescript
  valore: null, owner: null, data_apertura: null, appuntamento: null, stato_appuntamento: 'Non schedulato',
```

In each of these four files, replace the line:

```typescript
  data_apertura: null, appuntamento: null, ricontattare: null,
```

with:

```typescript
  data_apertura: null, appuntamento: null, stato_appuntamento: 'Non schedulato', ricontattare: null,
```

— `__tests__/LeadForm.hideNote.test.tsx:18`, `__tests__/LeadForm.callbacks.test.tsx:18`, `__tests__/LeadEditDrawer.test.tsx:18`, `__tests__/LeadDetailTabs.test.tsx:23`, `__tests__/LeadTable.actions.test.tsx:19`.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors (this is the real gate for this task — a missed fixture shows up here as "Property 'stato_appuntamento' is missing").

Run: `npm test`
Expected: all existing tests still pass (95/95 at the time this plan was written — the exact count may differ slightly by the time you run this if other work has landed; the point is 0 failures, not a specific number).

- [ ] **Step 6: Commit**

```bash
git add types/index.ts lib/lead-fields.ts types/index.test.ts lib/tasks.test.ts __tests__/LeadForm.hideNote.test.tsx __tests__/LeadForm.callbacks.test.tsx __tests__/LeadEditDrawer.test.tsx __tests__/LeadDetailTabs.test.tsx __tests__/LeadTable.actions.test.tsx
git commit -m "feat: add stato_appuntamento to Lead type and writable fields"
```

---

## Task 2: Migration SQL (file only — hand to human to apply)

**Files:**
- Create: `supabase/migrations/006_appointment_status.sql`

**Interfaces:** none — pure SQL, no code interface.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/006_appointment_status.sql`:

```sql
-- supabase/migrations/006_appointment_status.sql
-- Nuovo campo stato_appuntamento: esito dell'appuntamento, indipendente
-- dalla data/ora in `appuntamento` (sempre manuale, nessuna colonna legacy
-- da riconciliare — a differenza di stadio_pipeline/stato, qui non serve
-- uno script di migrazione dati: il DEFAULT copre tutte le righe esistenti).

ALTER TABLE leads ADD COLUMN stato_appuntamento text NOT NULL DEFAULT 'Non schedulato';

ALTER TABLE leads
  ADD CONSTRAINT leads_stato_appuntamento_check
  CHECK (stato_appuntamento IN ('Non schedulato', 'Schedulato', 'Effettuato', 'Non presentato'));
```

- [ ] **Step 2: Do not execute — hand off**

Do not run this against Supabase yourself (no DDL credentials available — see Global Constraints). Commit the file, then in your final report to the controller, state clearly that this SQL needs to be run by the human via the Supabase SQL editor before the branch is deployed. If you are the controller running this task directly rather than through a dispatched implementer, present the SQL to the human now and wait for confirmation it's been applied before treating Task 2 as done.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_appointment_status.sql
git commit -m "feat: add stato_appuntamento migration (column + CHECK constraint)"
```

---

## Task 3: Badge/chart colors + parity test

**Files:**
- Modify: `lib/stage-colors.ts`
- Modify: `lib/stage-colors.test.ts`

**Interfaces:**
- Consumes: `STATO_APPUNTAMENTO_OPTIONS: string[]` from Task 1.
- Produces: `STATO_APPUNTAMENTO_BADGE_CLASSES: Record<string, string>` (4 keys, Tailwind classes), `STATO_APPUNTAMENTO_CHART_COLORS: Record<string, string>` (4 keys, hex). Consumed by Tasks 5 and 7.

- [ ] **Step 1: Add the color maps**

Append to `lib/stage-colors.ts` (after the existing `STATO_BADGE_CLASSES` block):

```typescript

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
```

- [ ] **Step 2: Extend the parity test (TDD — write this first if you prefer, then Step 1)**

Replace `lib/stage-colors.test.ts:1-3`:

```typescript
import { describe, it, expect } from 'vitest'
import { STAGE_BADGE_CLASSES, STAGE_CHART_COLORS, STATO_BADGE_CLASSES } from './stage-colors'
import { DEFAULT_PIPELINE_STAGES, STATO_OPTIONS } from '@/types'
```

with:

```typescript
import { describe, it, expect } from 'vitest'
import { STAGE_BADGE_CLASSES, STAGE_CHART_COLORS, STATO_BADGE_CLASSES, STATO_APPUNTAMENTO_BADGE_CLASSES, STATO_APPUNTAMENTO_CHART_COLORS } from './stage-colors'
import { DEFAULT_PIPELINE_STAGES, STATO_OPTIONS, STATO_APPUNTAMENTO_OPTIONS } from '@/types'
```

Append to the `describe('stage-colors parity', ...)` block, before its closing `})` (`lib/stage-colors.test.ts:17`):

```typescript

  it('STATO_APPUNTAMENTO_BADGE_CLASSES has exactly the STATO_APPUNTAMENTO_OPTIONS keys', () => {
    expect(Object.keys(STATO_APPUNTAMENTO_BADGE_CLASSES).sort()).toEqual([...STATO_APPUNTAMENTO_OPTIONS].sort())
  })

  it('STATO_APPUNTAMENTO_CHART_COLORS has exactly the STATO_APPUNTAMENTO_OPTIONS keys', () => {
    expect(Object.keys(STATO_APPUNTAMENTO_CHART_COLORS).sort()).toEqual([...STATO_APPUNTAMENTO_OPTIONS].sort())
  })
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run lib/stage-colors.test.ts`
Expected: 5/5 passing (3 existing + 2 new).

- [ ] **Step 4: Commit**

```bash
git add lib/stage-colors.ts lib/stage-colors.test.ts
git commit -m "feat: add stato_appuntamento badge and chart color maps"
```

---

## Task 4: `LeadForm` — Stato Appuntamento Select

**Files:**
- Modify: `components/leads/LeadForm.tsx:12,70,288`

**Interfaces:**
- Consumes: `STATO_APPUNTAMENTO_OPTIONS: string[]` from Task 1.

- [ ] **Step 1: Import the new constant**

Replace `components/leads/LeadForm.tsx:12`:

```typescript
import { DEFAULT_PIPELINE_STAGES, ESPERIENZA_US_OPTIONS, ORIGINE_OPTIONS, INDUSTRY_OPTIONS, STATO_LEAD_OPTIONS, STATO_OPTIONS, DIPENDENTI_OPTIONS } from '@/types'
```

with:

```typescript
import { DEFAULT_PIPELINE_STAGES, ESPERIENZA_US_OPTIONS, ORIGINE_OPTIONS, INDUSTRY_OPTIONS, STATO_LEAD_OPTIONS, STATO_OPTIONS, STATO_APPUNTAMENTO_OPTIONS, DIPENDENTI_OPTIONS } from '@/types'
```

- [ ] **Step 2: Add the field to form state**

Replace `components/leads/LeadForm.tsx:70`:

```typescript
    appuntamento: lead?.appuntamento ? lead.appuntamento.slice(0, 16) : '',
```

with:

```typescript
    appuntamento: lead?.appuntamento ? lead.appuntamento.slice(0, 16) : '',
    stato_appuntamento: lead?.stato_appuntamento ?? 'Non schedulato',
```

- [ ] **Step 3: Add the Select next to the Appuntamento date field**

Replace `components/leads/LeadForm.tsx:288`:

```typescript
          <Field label="Appuntamento" name="appuntamento" type="datetime-local" form={form} set={set} />
```

with:

```typescript
          <Field label="Appuntamento" name="appuntamento" type="datetime-local" form={form} set={set} />
          <div className="space-y-1">
            <Label>Stato appuntamento</Label>
            <Select value={form.stato_appuntamento ?? 'Non schedulato'} onValueChange={v => set('stato_appuntamento', v ?? 'Non schedulato')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATO_APPUNTAMENTO_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm test`
Expected: all passing, no new failures (there's no dedicated `LeadForm.tsx` test for this specific field per this codebase's existing test coverage — `__tests__/LeadForm.callbacks.test.tsx` and `__tests__/LeadForm.hideNote.test.tsx` test other behaviors and should be unaffected).

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open `/leads/new` (or edit an existing lead). In the "Tempi" section, confirm a "Stato appuntamento" dropdown appears next to "Appuntamento", defaulting to "Non schedulato", with all 4 options selectable.

- [ ] **Step 6: Commit**

```bash
git add components/leads/LeadForm.tsx
git commit -m "feat: add Stato Appuntamento Select to LeadForm"
```

---

## Task 5: Badge in `LeadTable` and lead detail page

**Files:**
- Modify: `components/leads/LeadTable.tsx:15,85-96`
- Modify: `app/leads/[id]/page.tsx:12,53-61`

**Interfaces:**
- Consumes: `STATO_APPUNTAMENTO_BADGE_CLASSES: Record<string, string>` from Task 3.

Both badges are shown only when `stato_appuntamento !== 'Non schedulato'` — that's the default for every lead that hasn't reached an appointment yet, and showing it on every single row/lead would be pure noise (the same reasoning already applied to the `stato` badge, which only renders when non-null; here the field is NOT NULL with a "nothing happened yet" default, so the check is an inequality instead of a null check).

- [ ] **Step 1: `LeadTable.tsx` — import and badge**

Replace `components/leads/LeadTable.tsx:15`:

```typescript
import { STAGE_BADGE_CLASSES, STATO_BADGE_CLASSES } from '@/lib/stage-colors'
```

with:

```typescript
import { STAGE_BADGE_CLASSES, STATO_BADGE_CLASSES, STATO_APPUNTAMENTO_BADGE_CLASSES } from '@/lib/stage-colors'
```

Replace `components/leads/LeadTable.tsx:85-96`:

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
                    {lead.stato_appuntamento !== 'Non schedulato' && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATO_APPUNTAMENTO_BADGE_CLASSES[lead.stato_appuntamento] ?? 'bg-gray-100 text-gray-600'}`}>
                        {lead.stato_appuntamento}
                      </span>
                    )}
                  </div>
                </td>
```

- [ ] **Step 2: `app/leads/[id]/page.tsx` — import and badge**

Replace `app/leads/[id]/page.tsx:12`:

```typescript
import { STAGE_BADGE_CLASSES, STATO_BADGE_CLASSES } from '@/lib/stage-colors'
```

with:

```typescript
import { STAGE_BADGE_CLASSES, STATO_BADGE_CLASSES, STATO_APPUNTAMENTO_BADGE_CLASSES } from '@/lib/stage-colors'
```

Replace `app/leads/[id]/page.tsx:53-61`:

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
              {computed.stato_appuntamento !== 'Non schedulato' && (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATO_APPUNTAMENTO_BADGE_CLASSES[computed.stato_appuntamento] ?? 'bg-gray-100 text-gray-600'}`}>
                  {computed.stato_appuntamento}
                </span>
              )}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm test`
Expected: clean, all passing.

- [ ] **Step 4: Commit**

```bash
git add components/leads/LeadTable.tsx "app/leads/[id]/page.tsx"
git commit -m "feat: show stato_appuntamento badge in LeadTable and lead detail (when not default)"
```

---

## Task 6: `LeadFilters` — filter by Stato Appuntamento

**Files:**
- Modify: `components/leads/LeadFilters.tsx:9,21-27,107-116`
- Modify: `app/leads/page.tsx:18,42-46,59`

**Interfaces:**
- Consumes: `STATO_APPUNTAMENTO_OPTIONS: string[]` from Task 1.

- [ ] **Step 1: `LeadFilters.tsx` — import, read the URL param, add to `hasFilters`**

Replace `components/leads/LeadFilters.tsx:9`:

```typescript
import { ORIGINE_OPTIONS } from '@/types'
```

with:

```typescript
import { ORIGINE_OPTIONS, STATO_APPUNTAMENTO_OPTIONS } from '@/types'
```

Replace `components/leads/LeadFilters.tsx:21-27`:

```typescript
  const q = params.get('q') ?? ''
  const stadio = params.get('stadio') ?? 'all'
  const origine = params.get('origine') ?? 'all'
  const contattato = params.get('contattato') ?? 'all'
  const scaduto = params.get('scaduto') === '1'

  const hasFilters = q || stadio !== 'all' || origine !== 'all' || contattato !== 'all' || scaduto
```

with:

```typescript
  const q = params.get('q') ?? ''
  const stadio = params.get('stadio') ?? 'all'
  const origine = params.get('origine') ?? 'all'
  const contattato = params.get('contattato') ?? 'all'
  const statoAppuntamento = params.get('stato_appuntamento') ?? 'all'
  const scaduto = params.get('scaduto') === '1'

  const hasFilters = q || stadio !== 'all' || origine !== 'all' || contattato !== 'all' || statoAppuntamento !== 'all' || scaduto
```

- [ ] **Step 2: Add the dropdown**

Replace `components/leads/LeadFilters.tsx:107-116`:

```typescript
        <Select value={contattato} onValueChange={v => update({ contattato: v })}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="Contattato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="si">Contattati</SelectItem>
            <SelectItem value="no">Non contattati</SelectItem>
          </SelectContent>
        </Select>
```

with:

```typescript
        <Select value={contattato} onValueChange={v => update({ contattato: v })}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="Contattato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="si">Contattati</SelectItem>
            <SelectItem value="no">Non contattati</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statoAppuntamento} onValueChange={v => update({ stato_appuntamento: v })}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue placeholder="Stato appuntamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli appuntamenti</SelectItem>
            {STATO_APPUNTAMENTO_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
```

- [ ] **Step 3: `app/leads/page.tsx` — accept and apply the query param**

Replace `app/leads/page.tsx:18`:

```typescript
  searchParams: Promise<{ q?: string; stadio?: string; origine?: string; contattato?: string; scaduto?: string; page?: string; sortBy?: string; sortDir?: string }>
```

with:

```typescript
  searchParams: Promise<{ q?: string; stadio?: string; origine?: string; contattato?: string; stato_appuntamento?: string; scaduto?: string; page?: string; sortBy?: string; sortDir?: string }>
```

Replace `app/leads/page.tsx:42-46`:

```typescript
  if (sp.contattato === 'si') {
    query = query.eq('contattato', true)
  } else if (sp.contattato === 'no') {
    query = query.eq('contattato', false)
  }
```

with:

```typescript
  if (sp.contattato === 'si') {
    query = query.eq('contattato', true)
  } else if (sp.contattato === 'no') {
    query = query.eq('contattato', false)
  }
  if (sp.stato_appuntamento && sp.stato_appuntamento !== 'all') {
    query = query.eq('stato_appuntamento', sp.stato_appuntamento)
  }
```

Replace `app/leads/page.tsx:59`:

```typescript
  const hasFilters = !!(sp.q || (sp.stadio && sp.stadio !== 'all') || (sp.origine && sp.origine !== 'all') || sp.contattato || sp.scaduto === '1')
```

with:

```typescript
  const hasFilters = !!(sp.q || (sp.stadio && sp.stadio !== 'all') || (sp.origine && sp.origine !== 'all') || sp.contattato || (sp.stato_appuntamento && sp.stato_appuntamento !== 'all') || sp.scaduto === '1')
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm test`
Expected: clean, all passing.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open `/leads`. Confirm a "Stato appuntamento" dropdown appears among the filters, and selecting a value filters the list and updates the URL (`?stato_appuntamento=Schedulato`, etc.). Confirm "Reset" clears it along with the other filters.

- [ ] **Step 6: Commit**

```bash
git add components/leads/LeadFilters.tsx app/leads/page.tsx
git commit -m "feat: add stato_appuntamento filter to leads list"
```

---

## Task 7: Dashboard — no-show rate card + distribution chart

**Files:**
- Create: `components/dashboard/AppuntamentoChart.tsx`
- Modify: `components/dashboard/ChartsSection.tsx`
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `STATO_APPUNTAMENTO_CHART_COLORS: Record<string, string>` from Task 3, `STATO_APPUNTAMENTO_OPTIONS: string[]` from Task 1.
- Produces: `AppuntamentoChart` component with props `{ data: { stato: string; count: number }[]; onSegmentClick?: (stato: string) => void }`.

- [ ] **Step 1: Create the chart component**

Create `components/dashboard/AppuntamentoChart.tsx`:

```typescript
'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { STATO_APPUNTAMENTO_CHART_COLORS } from '@/lib/stage-colors'

type Props = {
  data: { stato: string; count: number }[]
  onSegmentClick?: (stato: string) => void
}

export function AppuntamentoChart({ data, onSegmentClick }: Props) {
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
          formatter={(value) => [`${value} lead`, 'Stato appuntamento']}
        />
        <Bar
          dataKey="count"
          radius={[0, 4, 4, 0]}
          cursor={onSegmentClick ? 'pointer' : undefined}
          onClick={onSegmentClick ? (entry: any) => onSegmentClick(entry.stato) : undefined}
        >
          {data.map(entry => (
            <Cell key={entry.stato} fill={STATO_APPUNTAMENTO_CHART_COLORS[entry.stato] ?? '#6366f1'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
```

(This is a deliberate near-duplicate of `PipelineChart.tsx`'s structure — same as `PipelineChart`/`ConversionChart`/`OwnerChart` already are in this codebase. Do not try to generalize/parameterize them into one shared component; that's out of scope and not something this plan asks for.)

- [ ] **Step 2: Wire into `ChartsSection.tsx`**

Replace `components/dashboard/ChartsSection.tsx:1-16`:

```typescript
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { OwnerChart } from '@/components/dashboard/OwnerChart'
import { SitoChart } from '@/components/dashboard/SitoChart'
import { DipendentiChart } from '@/components/dashboard/DipendentiChart'
import { IndustryChart } from '@/components/dashboard/IndustryChart'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { PipelineChart } from '@/components/dashboard/PipelineChart'
import { ConversionChart } from '@/components/dashboard/ConversionChart'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
```

with:

```typescript
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { OwnerChart } from '@/components/dashboard/OwnerChart'
import { SitoChart } from '@/components/dashboard/SitoChart'
import { DipendentiChart } from '@/components/dashboard/DipendentiChart'
import { IndustryChart } from '@/components/dashboard/IndustryChart'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { PipelineChart } from '@/components/dashboard/PipelineChart'
import { ConversionChart } from '@/components/dashboard/ConversionChart'
import { AppuntamentoChart } from '@/components/dashboard/AppuntamentoChart'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
```

Replace `components/dashboard/ChartsSection.tsx:18-41` (the `SlimLead` type and `Props` type):

```typescript
export type SlimLead = {
  id: string
  nome: string | null
  cognome: string | null
  azienda: string | null
  stadio_pipeline: string
  valore: number | null
  industry: string | null
  dipendenti: string | null
  origine: string | null
  data_apertura: string | null
  owner: string | null
}

type Props = {
  sitoChartData: { name: string; value: number }[]
  dipendentiChartData: { range: string; count: number }[]
  industryChartData: { name: string; value: number }[]
  trendChartData: { label: string; count: number; media: number; month: string }[]
  pipelineData: { stage: string; count: number; revenue: number }[]
  conversionChartData: { origine: string; tassoVinti: number; tassoNonVinti: number; tasso: number }[]
  ownerChartData: { name: string; value: number }[]
  leads: SlimLead[]
}
```

with:

```typescript
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

type Props = {
  sitoChartData: { name: string; value: number }[]
  dipendentiChartData: { range: string; count: number }[]
  industryChartData: { name: string; value: number }[]
  trendChartData: { label: string; count: number; media: number; month: string }[]
  pipelineData: { stage: string; count: number; revenue: number }[]
  conversionChartData: { origine: string; tassoVinti: number; tassoNonVinti: number; tasso: number }[]
  ownerChartData: { name: string; value: number }[]
  appuntamentoChartData: { stato: string; count: number }[]
  leads: SlimLead[]
}
```

Replace `components/dashboard/ChartsSection.tsx:49-58` (function signature):

```typescript
export function ChartsSection({
  sitoChartData,
  dipendentiChartData,
  industryChartData,
  trendChartData,
  pipelineData,
  conversionChartData,
  ownerChartData,
  leads,
}: Props) {
```

with:

```typescript
export function ChartsSection({
  sitoChartData,
  dipendentiChartData,
  industryChartData,
  trendChartData,
  pipelineData,
  conversionChartData,
  ownerChartData,
  appuntamentoChartData,
  leads,
}: Props) {
```

Add a click handler alongside the existing ones — replace `components/dashboard/ChartsSection.tsx:87-91`:

```typescript
  function openOwner(name: string) {
    open(`Owner: ${name}`, leads.filter(l =>
      name === 'N/D' ? !l.owner : l.owner === name
    ))
  }
```

with:

```typescript
  function openOwner(name: string) {
    open(`Owner: ${name}`, leads.filter(l =>
      name === 'N/D' ? !l.owner : l.owner === name
    ))
  }

  function openAppuntamento(stato: string) {
    open(`Stato appuntamento: ${stato}`, leads.filter(l => l.stato_appuntamento === stato))
  }
```

Add the chart's own section — replace `components/dashboard/ChartsSection.tsx:117-120`:

```typescript
      <div className="rounded-lg border p-4">
        <h2 className="font-semibold mb-4">Lead per owner</h2>
        <OwnerChart data={ownerChartData} onSegmentClick={openOwner} />
      </div>
```

with:

```typescript
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

(This turns the previously full-width "Lead per owner" row into a 2-column row shared with the new chart — matches the layout pattern already used for the Pipeline/Conversione row directly above it.)

- [ ] **Step 3: Compute the data and the no-show KPI in `app/dashboard/page.tsx`**

Replace `app/dashboard/page.tsx:6`:

```typescript
import { computeLeadFields, STATO_TERMINALI } from '@/types'
```

with:

```typescript
import { computeLeadFields, STATO_TERMINALI, STATO_APPUNTAMENTO_OPTIONS } from '@/types'
```

Add the no-show computation — replace `app/dashboard/page.tsx:78-84`:

```typescript
  const wonWithDays = wonLeads.filter(l => l.giorni_pipeline !== null)
  const avgDaysToClose = wonWithDays.length > 0
    ? Math.round(wonWithDays.reduce((sum, l) => sum + (l.giorni_pipeline ?? 0), 0) / wonWithDays.length)
    : 0

  const totalRevenue = wonLeads.reduce((sum, l) => sum + (l.valore ?? 0), 0)
  const pipelineValue = openLeads.reduce((sum, l) => sum + (l.valore ?? 0), 0)
```

with:

```typescript
  const wonWithDays = wonLeads.filter(l => l.giorni_pipeline !== null)
  const avgDaysToClose = wonWithDays.length > 0
    ? Math.round(wonWithDays.reduce((sum, l) => sum + (l.giorni_pipeline ?? 0), 0) / wonWithDays.length)
    : 0

  const totalRevenue = wonLeads.reduce((sum, l) => sum + (l.valore ?? 0), 0)
  const pipelineValue = openLeads.reduce((sum, l) => sum + (l.valore ?? 0), 0)

  // Tasso no-show: esclude Schedulato (esito non ancora noto) e Non schedulato
  // (non applicabile) dal denominatore — risponde a "di chi arriva a un
  // appuntamento, quanti non si presentano".
  const nonPresentati = allLeads.filter(l => l.stato_appuntamento === 'Non presentato').length
  const effettuati = allLeads.filter(l => l.stato_appuntamento === 'Effettuato').length
  const noShowRate = (nonPresentati + effettuati) > 0
    ? Math.round((nonPresentati / (nonPresentati + effettuati)) * 100)
    : 0

  const appuntamentoChartData = STATO_APPUNTAMENTO_OPTIONS.map(stato => ({
    stato,
    count: allLeads.filter(l => l.stato_appuntamento === stato).length,
  }))
```

Add `stato_appuntamento` to the `slimLeads` mapping — replace `app/dashboard/page.tsx:178-190`:

```typescript
  const slimLeads: SlimLead[] = allLeadsRaw.map(l => ({
    id: l.id,
    nome: l.nome,
    cognome: l.cognome,
    azienda: l.azienda,
    stadio_pipeline: l.stadio_pipeline,
    valore: l.valore,
    industry: l.industry,
    dipendenti: l.dipendenti,
    origine: l.origine,
    data_apertura: l.data_apertura,
    owner: l.owner,
  }))
```

with:

```typescript
  const slimLeads: SlimLead[] = allLeadsRaw.map(l => ({
    id: l.id,
    nome: l.nome,
    cognome: l.cognome,
    azienda: l.azienda,
    stadio_pipeline: l.stadio_pipeline,
    stato_appuntamento: l.stato_appuntamento,
    valore: l.valore,
    industry: l.industry,
    dipendenti: l.dipendenti,
    origine: l.origine,
    data_apertura: l.data_apertura,
    owner: l.owner,
  }))
```

- [ ] **Step 4: Add the KPI card and pass the chart data**

Replace `app/dashboard/page.tsx:213-220` (the KPI grid):

```typescript
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatsCard title="Lead totali" value={allLeads.length} subtitle={`${openLeads.length} aperti`} icon={Users} color="blue" />
        <StatsCard title="Tasso conversione" value={`${conversionRate}%`} subtitle={`${wonLeads.length} vinti su ${allLeads.length}`} icon={TrendingUp} color="green" />
        <StatsCard title="Fatturato vinti" value={`€${totalRevenue.toLocaleString('it-IT')}`} subtitle={`${wonLeads.length} deal chiusi`} icon={Euro} color="green" />
        <StatsCard title="Pipeline aperta" value={`€${pipelineValue.toLocaleString('it-IT')}`} subtitle={`${openLeads.filter(l => l.valore).length} deal con valore`} icon={Target} color="blue" />
        <StatsCard title="Giorni medi chiusura" value={avgDaysToClose} icon={Clock} color="amber" />
        <StatsCard title="Scaduti follow-up" value={overdue.length} subtitle={`soglia: ${settings.followup_threshold_days}gg`} icon={AlertCircle} color="red" />
      </div>
```

with:

```typescript
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

This uses a `CalendarX` icon that isn't imported yet — replace `app/dashboard/page.tsx:8`:

```typescript
import { Users, TrendingUp, Clock, AlertCircle, Euro, Trophy, Target } from 'lucide-react'
```

with:

```typescript
import { Users, TrendingUp, Clock, AlertCircle, Euro, Trophy, Target, CalendarX } from 'lucide-react'
```

Finally, pass the new chart data into `<ChartsSection>` — replace `app/dashboard/page.tsx:222-231`:

```typescript
      <ChartsSection
        sitoChartData={sitoChartData}
        dipendentiChartData={dipendentiChartData}
        industryChartData={industryChartData}
        trendChartData={trendChartData}
        pipelineData={leadsByStage}
        conversionChartData={conversionChartData}
        ownerChartData={ownerChartData}
        leads={slimLeads}
      />
```

with:

```typescript
      <ChartsSection
        sitoChartData={sitoChartData}
        dipendentiChartData={dipendentiChartData}
        industryChartData={industryChartData}
        trendChartData={trendChartData}
        pipelineData={leadsByStage}
        conversionChartData={conversionChartData}
        ownerChartData={ownerChartData}
        appuntamentoChartData={appuntamentoChartData}
        leads={slimLeads}
      />
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npm test`
Expected: clean, all passing.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, open `/dashboard`. Confirm a 7th KPI card "Tasso no-show" appears (0% is expected until leads actually have `Effettuato`/`Non presentato` set). Confirm a new "Stato appuntamento" bar chart appears next to "Lead per owner", showing all 4 states (every lead starts as "Non schedulato" until the migration's rollout, so that bar should dominate initially — this is expected, not a bug). Click a bar and confirm the modal opens with the matching leads.

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/AppuntamentoChart.tsx components/dashboard/ChartsSection.tsx app/dashboard/page.tsx
git commit -m "feat: add no-show rate KPI card and stato appuntamento distribution chart"
```

---

## Task 8: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm the migration was applied**

Before this step, confirm with the human that Task 2's SQL has been run in the Supabase SQL editor. If not, stop here — nothing past this point will work against production data.

- [ ] **Step 2: Run the full automated suite**

Run: `npm test`
Expected: all tests passing, 0 failures.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual walkthrough**

Run: `npm run dev`, then in the browser:
1. `/leads/new` — create a lead, set Stato appuntamento to "Schedulato", save. Confirm it saves without error.
2. Edit that lead, change Stato appuntamento to "Effettuato". Confirm the badge appears in `/leads` list and on the lead detail page (and that it disappears again if you set it back to "Non schedulato" — the default shouldn't show a badge).
3. `/leads` — filter by each of the 4 Stato appuntamento values, confirm the list updates and the URL reflects `?stato_appuntamento=...`.
4. `/dashboard` — confirm the "Tasso no-show" card and "Stato appuntamento" chart reflect the leads you just edited.

- [ ] **Step 5: Report results**

Summarize pass/fail for each of the 4 manual checks plus the automated suite. If anything fails, stop and fix before considering this plan complete.
