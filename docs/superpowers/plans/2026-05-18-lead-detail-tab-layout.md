# Lead Detail Tab Layout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-column lead detail layout with pill tabs (Dettagli / Note / HubSpot) on the left and a permanently visible InteractionTimeline on the right.

**Architecture:** A new client component `LeadDetailTabs` owns tab state and renders the correct child per active tab. `page.tsx` (server) stays unchanged except swapping the two-column block for `<LeadDetailTabs>`. `LeadForm` gets a `hideNote` prop to suppress the note field when it lives in its own tab. `NoteTab` auto-saves on blur via a silent PATCH.

**Tech Stack:** Next.js 16 (App Router), React, shadcn/ui, TypeScript, Vitest + Testing Library

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `components/leads/LeadForm.tsx` | Modify | Add `hideNote?: boolean` prop |
| `app/leads/[id]/NoteTab.tsx` | Create | Auto-saving note textarea |
| `app/leads/[id]/LeadDetailTabs.tsx` | Create | Tab state + layout |
| `app/leads/[id]/page.tsx` | Modify | Swap two-column block for `<LeadDetailTabs>` |
| `__tests__/LeadForm.hideNote.test.tsx` | Create | Test hideNote prop |
| `__tests__/NoteTab.test.tsx` | Create | Test auto-save behaviour |
| `__tests__/LeadDetailTabs.test.tsx` | Create | Test tab switching |

---

## Shared Test Fixture

All tasks reference this fixture. Define it once in each test file.

```ts
import type { LeadWithComputed } from '@/types'

const mockLead: LeadWithComputed = {
  id: 'lead-1',
  created_at: '2026-01-01T00:00:00Z',
  nome: 'Marco', cognome: 'Rossi',
  azienda: 'Acme', email: 'marco@acme.it',
  tel: null, ruolo: null, tipo: null, richiesta: null,
  origine: null, industry: null, dipendenti: null,
  hanno_sito: null, company_web: null, esperienza_us: null,
  stadio_pipeline: 'Lead In', stato_lead: null, stato: null,
  motivo_lost: null, valore: null, owner: null,
  data_apertura: null, appuntamento: null, ricontattare: null,
  data_ultimo_contatto: null, data_chiusura: null,
  contattato: false, numero_messaggi: 0,
  risposto_ultima_mail: false, touchpoints: 0,
  note: 'Nota di test',
  giorni_ultimo_contatto: null, giorni_aperto: null, giorni_pipeline: null,
}
```

---

## Task 1: Add `hideNote` prop to LeadForm

**Files:**
- Modify: `components/leads/LeadForm.tsx`
- Create: `__tests__/LeadForm.hideNote.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/LeadForm.hideNote.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { LeadForm } from '@/components/leads/LeadForm'
import type { LeadWithComputed } from '@/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockLead: LeadWithComputed = {
  id: 'lead-1', created_at: '2026-01-01T00:00:00Z',
  nome: 'Marco', cognome: 'Rossi', azienda: 'Acme', email: 'marco@acme.it',
  tel: null, ruolo: null, tipo: null, richiesta: null, origine: null,
  industry: null, dipendenti: null, hanno_sito: null, company_web: null,
  esperienza_us: null, stadio_pipeline: 'Lead In', stato_lead: null,
  stato: null, motivo_lost: null, valore: null, owner: null,
  data_apertura: null, appuntamento: null, ricontattare: null,
  data_ultimo_contatto: null, data_chiusura: null, contattato: false,
  numero_messaggi: 0, risposto_ultima_mail: false, touchpoints: 0,
  note: 'Nota di test',
  giorni_ultimo_contatto: null, giorni_aperto: null, giorni_pipeline: null,
}

beforeEach(() => {
  window.ResizeObserver = vi.fn(() => ({
    observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
  })) as unknown as typeof ResizeObserver
})

describe('LeadForm hideNote', () => {
  test('shows Note field by default', () => {
    render(<LeadForm lead={mockLead} />)
    expect(screen.getByLabelText('Note')).toBeInTheDocument()
  })

  test('hides Note field when hideNote is true', () => {
    render(<LeadForm lead={mockLead} hideNote />)
    expect(screen.queryByLabelText('Note')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/pietrolatorre/Desktop/New_CRM_2_def
npx vitest run __tests__/LeadForm.hideNote.test.tsx
```

Expected: `hides Note field when hideNote is true` FAIL (prop doesn't exist yet).

- [ ] **Step 3: Add `hideNote` prop to LeadForm**

In `components/leads/LeadForm.tsx`:

Change the `Props` type (line 14-17):
```ts
type Props = {
  lead?: LeadWithComputed
  stages?: string[]
  hideNote?: boolean
}
```

Change the function signature (line 19):
```ts
export function LeadForm({ lead, stages = DEFAULT_PIPELINE_STAGES, hideNote }: Props) {
```

Add note exclusion in `handleSubmit` — after the `for (const key of Object.keys(body))` loop (around line 85), add:
```ts
if (hideNote) delete body.note
```

Wrap the note section at the bottom of the JSX (lines 278-281) with a conditional:
```tsx
{!hideNote && (
  <section className="space-y-2">
    <Label htmlFor="note">Note</Label>
    <Textarea id="note" value={form.note} onChange={e => set('note', e.target.value)} rows={4} />
  </section>
)}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run __tests__/LeadForm.hideNote.test.tsx
```

Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/leads/LeadForm.tsx __tests__/LeadForm.hideNote.test.tsx
git commit -m "feat: add hideNote prop to LeadForm"
```

---

## Task 2: Create NoteTab component

**Files:**
- Create: `app/leads/[id]/NoteTab.tsx`
- Create: `__tests__/NoteTab.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/NoteTab.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import { NoteTab } from '@/app/leads/[id]/NoteTab'

describe('NoteTab', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('renders textarea with initial note value', () => {
    render(<NoteTab leadId="lead-1" initialNote="Nota di test" />)
    expect(screen.getByRole('textbox')).toHaveValue('Nota di test')
  })

  test('renders empty textarea when initialNote is null', () => {
    render(<NoteTab leadId="lead-1" initialNote={null} />)
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  test('PATCHes on blur with updated value', async () => {
    render(<NoteTab leadId="lead-1" initialNote="vecchia nota" />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'nuova nota' } })
    fireEvent.blur(textarea)
    expect(mockFetch).toHaveBeenCalledWith('/api/leads/lead-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: 'nuova nota' }),
    })
  })

  test('shows "Salvato ✓" after successful save', async () => {
    render(<NoteTab leadId="lead-1" initialNote="nota" />)
    fireEvent.blur(screen.getByRole('textbox'))
    await screen.findByText('Salvato ✓')
  })

  test('shows "Errore" when PATCH fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })
    render(<NoteTab leadId="lead-1" initialNote="nota" />)
    fireEvent.blur(screen.getByRole('textbox'))
    await screen.findByText('Errore')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run __tests__/NoteTab.test.tsx
```

Expected: all FAIL (module not found).

- [ ] **Step 3: Implement NoteTab**

Create `app/leads/[id]/NoteTab.tsx`:

```tsx
'use client'
import { useState, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type Props = {
  leadId: string
  initialNote: string | null
}

export function NoteTab({ leadId, initialNote }: Props) {
  const [note, setNote] = useState(initialNote ?? '')
  const [status, setStatus] = useState<SaveStatus>('idle')

  const handleBlur = useCallback(async () => {
    setStatus('saving')
    const res = await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    })
    if (res.ok) {
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } else {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }, [leadId, note])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Note</span>
        {status === 'saved' && (
          <span className="text-xs text-green-600 animate-in fade-in">Salvato ✓</span>
        )}
        {status === 'error' && (
          <span className="text-xs text-destructive">Errore</span>
        )}
      </div>
      <Textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        onBlur={handleBlur}
        rows={12}
        placeholder="Scrivi note sul lead..."
        className="resize-none"
      />
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run __tests__/NoteTab.test.tsx
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/leads/\[id\]/NoteTab.tsx __tests__/NoteTab.test.tsx
git commit -m "feat: NoteTab component with auto-save on blur"
```

---

## Task 3: Create LeadDetailTabs component

**Files:**
- Create: `app/leads/[id]/LeadDetailTabs.tsx`
- Create: `__tests__/LeadDetailTabs.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/LeadDetailTabs.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, test, expect } from 'vitest'
import { LeadDetailTabs } from '@/app/leads/[id]/LeadDetailTabs'
import type { LeadWithComputed, Interaction } from '@/types'

vi.mock('@/components/leads/LeadForm', () => ({
  LeadForm: () => <div data-testid="lead-form" />,
}))
vi.mock('@/app/leads/[id]/NoteTab', () => ({
  NoteTab: () => <div data-testid="note-tab" />,
}))
vi.mock('@/components/leads/InteractionTimeline', () => ({
  InteractionTimeline: () => <div data-testid="interaction-timeline" />,
}))

const mockLead: LeadWithComputed = {
  id: 'lead-1', created_at: '2026-01-01T00:00:00Z',
  nome: 'Marco', cognome: 'Rossi', azienda: 'Acme', email: 'marco@acme.it',
  tel: null, ruolo: null, tipo: null, richiesta: null, origine: null,
  industry: null, dipendenti: null, hanno_sito: null, company_web: null,
  esperienza_us: null, stadio_pipeline: 'Lead In', stato_lead: null,
  stato: null, motivo_lost: null, valore: null, owner: null,
  data_apertura: null, appuntamento: null, ricontattare: null,
  data_ultimo_contatto: null, data_chiusura: null, contattato: false,
  numero_messaggi: 0, risposto_ultima_mail: false, touchpoints: 0,
  note: 'Nota di test',
  giorni_ultimo_contatto: null, giorni_aperto: null, giorni_pipeline: null,
}

const mockInteractions: Interaction[] = []

describe('LeadDetailTabs', () => {
  test('renders 3 tab buttons', () => {
    render(<LeadDetailTabs lead={mockLead} interactions={mockInteractions} stages={[]} />)
    expect(screen.getByRole('button', { name: 'Dettagli' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Note' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /HubSpot/ })).toBeInTheDocument()
  })

  test('shows LeadForm by default (Dettagli tab)', () => {
    render(<LeadDetailTabs lead={mockLead} interactions={mockInteractions} stages={[]} />)
    expect(screen.getByTestId('lead-form')).toBeInTheDocument()
    expect(screen.queryByTestId('note-tab')).not.toBeInTheDocument()
  })

  test('InteractionTimeline always visible', () => {
    render(<LeadDetailTabs lead={mockLead} interactions={mockInteractions} stages={[]} />)
    expect(screen.getByTestId('interaction-timeline')).toBeInTheDocument()
  })

  test('clicking Note tab shows NoteTab', () => {
    render(<LeadDetailTabs lead={mockLead} interactions={mockInteractions} stages={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Note' }))
    expect(screen.getByTestId('note-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('lead-form')).not.toBeInTheDocument()
  })

  test('clicking HubSpot tab shows placeholder text', () => {
    render(<LeadDetailTabs lead={mockLead} interactions={mockInteractions} stages={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /HubSpot/ }))
    expect(screen.getByText(/non ancora sincronizzato/i)).toBeInTheDocument()
  })

  test('clicking Dettagli tab after switching returns to LeadForm', () => {
    render(<LeadDetailTabs lead={mockLead} interactions={mockInteractions} stages={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Dettagli' }))
    expect(screen.getByTestId('lead-form')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run __tests__/LeadDetailTabs.test.tsx
```

Expected: all FAIL (module not found).

- [ ] **Step 3: Implement LeadDetailTabs**

Create `app/leads/[id]/LeadDetailTabs.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { LeadForm } from '@/components/leads/LeadForm'
import { InteractionTimeline } from '@/components/leads/InteractionTimeline'
import { NoteTab } from './NoteTab'
import type { LeadWithComputed, Interaction } from '@/types'

type Tab = 'dettagli' | 'note' | 'hubspot'

type Props = {
  lead: LeadWithComputed
  interactions: Interaction[]
  stages: string[]
}

export function LeadDetailTabs({ lead, interactions, stages }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('dettagli')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
      {/* Left column: pill tabs + content */}
      <div>
        {/* Pill tabs */}
        <div className="inline-flex bg-muted rounded-full p-1 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('dettagli')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              activeTab === 'dettagli'
                ? 'bg-white shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Dettagli
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('note')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              activeTab === 'note'
                ? 'bg-white shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Note
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hubspot')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'hubspot'
                ? 'bg-white shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            HubSpot
            <span className="text-xs bg-indigo-100 text-indigo-600 rounded px-1.5 py-0.5 leading-none">
              presto
            </span>
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'dettagli' && (
          <LeadForm lead={lead} stages={stages} hideNote />
        )}
        {activeTab === 'note' && (
          <NoteTab leadId={lead.id} initialNote={lead.note} />
        )}
        {activeTab === 'hubspot' && (
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔗</span>
              <span className="font-semibold">HubSpot</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Contatto non ancora sincronizzato. Si attiverà automaticamente quando il lead
              raggiungerà Proposal Sent+.
            </p>
            <button
              type="button"
              disabled
              className="text-sm px-4 py-2 rounded-md border bg-muted text-muted-foreground cursor-not-allowed"
            >
              Collega manualmente
            </button>
          </div>
        )}
      </div>

      {/* Right column: timeline always visible */}
      <div className="lg:sticky lg:top-6">
        <InteractionTimeline leadId={lead.id} interactions={interactions} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run __tests__/LeadDetailTabs.test.tsx
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/leads/[id]/LeadDetailTabs.tsx" __tests__/LeadDetailTabs.test.tsx
git commit -m "feat: LeadDetailTabs with pill tabs and timeline"
```

---

## Task 4: Wire LeadDetailTabs into page.tsx

**Files:**
- Modify: `app/leads/[id]/page.tsx`

No new tests — page.tsx is a server component, already covered by child component tests above.

- [ ] **Step 1: Update imports in page.tsx**

In `app/leads/[id]/page.tsx`, replace:

```tsx
import { LeadForm } from '@/components/leads/LeadForm'
import { InteractionTimeline } from '@/components/leads/InteractionTimeline'
```

With:

```tsx
import { LeadDetailTabs } from './LeadDetailTabs'
```

- [ ] **Step 2: Replace two-column block**

In `app/leads/[id]/page.tsx`, find and replace the two-column block:

Replace this:
```tsx
      {/* 2 colonne: form + interazioni */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <LeadForm lead={computed} stages={settings.pipeline_stages} />

        <div className="lg:sticky lg:top-6">
          <InteractionTimeline leadId={id} interactions={interactions ?? []} />
        </div>
      </div>
```

With:
```tsx
      <LeadDetailTabs
        lead={computed}
        interactions={interactions ?? []}
        stages={settings.pipeline_stages}
      />
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 4: Start dev server and verify manually**

```bash
npm run dev
```

Open `http://localhost:3000/leads/<any-id>`:
- [ ] Pill tabs visible below header
- [ ] Dettagli tab active by default, form renders normally (no Note field)
- [ ] Note tab shows auto-saving textarea (edit text, click away → "Salvato ✓" appears)
- [ ] HubSpot tab shows placeholder card with disabled button
- [ ] InteractionTimeline always visible on the right
- [ ] Layout matches `lg:grid-cols-[1fr_360px]` on wide screen
- [ ] On mobile (< lg), two columns stack vertically

- [ ] **Step 5: Commit**

```bash
git add "app/leads/[id]/page.tsx"
git commit -m "feat: lead detail tab layout — pill tabs + auto-save note + HubSpot placeholder"
```
