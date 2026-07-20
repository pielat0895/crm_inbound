# Lead Quick-edit & Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettere di modificare (drawer laterale) o eliminare (con conferma) un lead direttamente dalla lista `/leads`, senza entrare nel dettaglio.

**Architecture:** Riuso del `LeadForm` esistente dentro un drawer slide-over costruito sul primitive `@base-ui/react/dialog`. `LeadTable` guadagna una colonna "Azioni" con due icon-button (edit/delete) e gestisce a livello di tabella un singolo drawer e un singolo dialog di conferma. Le mutazioni usano gli endpoint già esistenti `PATCH`/`DELETE /api/leads/[id]` e un `router.refresh()` per risincronizzare i dati dal Server Component `force-dynamic`.

**Tech Stack:** Next.js 16 (App Router), React 19, `@base-ui/react` (Dialog), Tailwind v4 + `tw-animate-css`, lucide-react, sonner, Vitest + Testing Library.

---

## File Structure

- **Modify** `components/leads/LeadForm.tsx` — due prop opzionali `onSaved`/`onCancel` per riusare il form fuori dal flusso pagina.
- **Create** `components/leads/LeadEditDrawer.tsx` — drawer slide-over che avvolge `LeadForm`.
- **Modify** `components/leads/LeadTable.tsx` — colonna Azioni, stato drawer/delete, dialog di conferma.
- **Modify** `app/leads/page.tsx` — hardening: sanitizza `sp.q` prima dell'`.or()` PostgREST.
- **Create** `__tests__/LeadForm.callbacks.test.tsx`, `__tests__/LeadEditDrawer.test.tsx`, `__tests__/LeadTable.actions.test.tsx`.

> **Nota ambiente test:** in questo sandbox il pool multi-worker di Vitest va in timeout; girare i test un file alla volta (`npx vitest run <file>`) o con `fileParallelism: false`. Sulla macchina dell'utente `npm test` gira normale. I test jsdom sono lenti (~25s import a file).

---

### Task 1: `LeadForm` — prop `onSaved` / `onCancel`

**Files:**
- Modify: `components/leads/LeadForm.tsx`
- Test: `__tests__/LeadForm.callbacks.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/LeadForm.callbacks.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

describe('LeadForm callbacks', () => {
  test('calls onCancel instead of router.back when provided', () => {
    const onCancel = vi.fn()
    render(<LeadForm lead={mockLead} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('calls onSaved after successful PATCH', async () => {
    const onSaved = vi.fn()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ id: 'lead-1' }),
    }) as unknown as typeof fetch
    render(<LeadForm lead={mockLead} onSaved={onSaved} />)
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/LeadForm.callbacks.test.tsx`
Expected: FAIL — `onCancel`/`onSaved` non esistono ancora, il click su "Annulla" chiama `router.back` e la callback non viene invocata.

- [ ] **Step 3: Add the props and wire them**

In `components/leads/LeadForm.tsx`, estendere il tipo `Props` (righe 14-18):

```tsx
type Props = {
  lead?: LeadWithComputed
  stages?: string[]
  hideNote?: boolean
  onSaved?: () => void
  onCancel?: () => void
}
```

Aggiornare la firma della funzione (riga 42):

```tsx
export function LeadForm({ lead, stages = DEFAULT_PIPELINE_STAGES, hideNote, onSaved, onCancel }: Props) {
```

Nel blocco di successo di `handleSubmit` (righe 129-136), sostituire:

```tsx
    const saved = await res.json()
    toast.success(isEdit ? 'Modifiche salvate' : 'Lead creato')
    setLoading(false)
    if (onSaved) {
      onSaved()
    } else if (isEdit) {
      router.refresh()
    } else {
      router.push(`/leads/${saved.id}`)
    }
```

Sostituire il bottone "Annulla" (righe 317-319):

```tsx
        <Button type="button" variant="outline" onClick={() => (onCancel ? onCancel() : router.back())}>
          Annulla
        </Button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/LeadForm.callbacks.test.tsx`
Expected: PASS (2 test).

- [ ] **Step 5: Verify no regression on existing LeadForm test**

Run: `npx vitest run __tests__/LeadForm.hideNote.test.tsx`
Expected: PASS (2 test).

- [ ] **Step 6: Commit**

```bash
git add components/leads/LeadForm.tsx __tests__/LeadForm.callbacks.test.tsx
git commit -m "feat(LeadForm): optional onSaved/onCancel callbacks"
```

---

### Task 2: `LeadEditDrawer` component

**Files:**
- Create: `components/leads/LeadEditDrawer.tsx`
- Test: `__tests__/LeadEditDrawer.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/LeadEditDrawer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { LeadEditDrawer } from '@/components/leads/LeadEditDrawer'
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
  note: null,
  giorni_ultimo_contatto: null, giorni_aperto: null, giorni_pipeline: null,
}

beforeEach(() => {
  window.ResizeObserver = vi.fn(() => ({
    observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
  })) as unknown as typeof ResizeObserver
})

describe('LeadEditDrawer', () => {
  test('renders the pre-filled form when open', () => {
    render(<LeadEditDrawer lead={mockLead} open onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByText('Modifica lead')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Marco')
  })

  test('renders nothing visible when closed', () => {
    render(<LeadEditDrawer lead={mockLead} open={false} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.queryByText('Modifica lead')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/LeadEditDrawer.test.tsx`
Expected: FAIL — modulo `LeadEditDrawer` inesistente.

- [ ] **Step 3: Create the component**

Create `components/leads/LeadEditDrawer.tsx`:

```tsx
'use client'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LeadForm } from './LeadForm'
import type { LeadWithComputed } from '@/types'

type Props = {
  lead: LeadWithComputed | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function LeadEditDrawer({ lead, open, onClose, onSaved }: Props) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/20 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPrimitive.Popup
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-xl flex-col bg-background shadow-xl outline-none',
            'data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right'
          )}
        >
          <div className="flex items-center justify-between border-b px-6 py-4">
            <DialogPrimitive.Title className="font-heading text-base font-medium">
              Modifica lead
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Chiudi"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {lead && (
              <LeadForm lead={lead} hideNote onSaved={onSaved} onCancel={onClose} />
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/LeadEditDrawer.test.tsx`
Expected: PASS (2 test).

- [ ] **Step 5: Commit**

```bash
git add components/leads/LeadEditDrawer.tsx __tests__/LeadEditDrawer.test.tsx
git commit -m "feat(leads): slide-over LeadEditDrawer wrapping LeadForm"
```

---

### Task 3: `LeadTable` — colonna Azioni, drawer, conferma delete

**Files:**
- Modify: `components/leads/LeadTable.tsx`
- Test: `__tests__/LeadTable.actions.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/LeadTable.actions.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { LeadTable } from '@/components/leads/LeadTable'
import type { LeadWithComputed } from '@/types'

const { push, refresh } = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh, back: vi.fn() }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockLead: LeadWithComputed = {
  id: 'lead-1', created_at: '2026-01-01T00:00:00Z',
  nome: 'Marco', cognome: 'Rossi', azienda: 'Acme', email: 'marco@acme.it',
  tel: null, ruolo: null, tipo: null, richiesta: null, origine: 'Web',
  industry: null, dipendenti: null, hanno_sito: null, company_web: null,
  esperienza_us: null, stadio_pipeline: 'Lead In', stato_lead: null,
  stato: null, motivo_lost: null, valore: 1000, owner: null,
  data_apertura: null, appuntamento: null, ricontattare: null,
  data_ultimo_contatto: null, data_chiusura: null, contattato: false,
  numero_messaggi: 0, risposto_ultima_mail: false, touchpoints: 0,
  note: null,
  giorni_ultimo_contatto: null, giorni_aperto: null, giorni_pipeline: null,
}

function renderTable() {
  return render(
    <LeadTable leads={[mockLead]} threshold={7} total={1} page={1} pageSize={50} />
  )
}

beforeEach(() => {
  push.mockClear()
  refresh.mockClear()
  window.ResizeObserver = vi.fn(() => ({
    observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
  })) as unknown as typeof ResizeObserver
})

describe('LeadTable actions', () => {
  test('renders edit and delete buttons per row', () => {
    renderTable()
    expect(screen.getByLabelText('Modifica lead')).toBeInTheDocument()
    expect(screen.getByLabelText('Elimina lead')).toBeInTheDocument()
  })

  test('clicking edit does not navigate to detail (stopPropagation)', () => {
    renderTable()
    fireEvent.click(screen.getByLabelText('Modifica lead'))
    expect(push).not.toHaveBeenCalled()
  })

  test('clicking delete opens the confirm dialog', () => {
    renderTable()
    fireEvent.click(screen.getByLabelText('Elimina lead'))
    expect(screen.getByText('Eliminare lead?')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/LeadTable.actions.test.tsx`
Expected: FAIL — nessun button "Modifica lead"/"Elimina lead" nella tabella.

- [ ] **Step 3: Update imports and add state**

In `components/leads/LeadTable.tsx`, sostituire le righe di import 1-8 con:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { LeadWithComputed } from '@/types'
import { OverdueBadge } from '@/components/ui/OverdueBadge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SortableHeader } from './SortableHeader'
import { LeadEditDrawer } from './LeadEditDrawer'
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Users, SearchX, Pencil, Trash2 } from 'lucide-react'
```

Subito dentro il corpo del componente, dopo `const totalPages = ...` (riga 33), aggiungere:

```tsx
  const [rows, setRows] = useState(leads)
  const [editingLead, setEditingLead] = useState<LeadWithComputed | null>(null)
  const [deletingLead, setDeletingLead] = useState<LeadWithComputed | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { setRows(leads) }, [leads])

  async function handleDelete() {
    if (!deletingLead) return
    setDeleting(true)
    const res = await fetch(`/api/leads/${deletingLead.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) { toast.error('Errore durante l\'eliminazione'); return }
    toast.success('Lead eliminato')
    setRows(prev => prev.filter(l => l.id !== deletingLead.id))
    setDeletingLead(null)
    router.refresh()
  }
```

- [ ] **Step 4: Add the Azioni header and cell**

In `LeadTable.tsx`, dopo il `<th>` "Valore" (riga 53), aggiungere:

```tsx
              <th className="px-4 py-2 text-right font-medium">Azioni</th>
```

Cambiare `leads.map` in `rows.map` (riga 57):

```tsx
            {rows.map(lead => (
```

Dopo la `<td>` del Valore (righe 79-81), aggiungere la cella azioni:

```tsx
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Modifica lead"
                      onClick={(e) => { e.stopPropagation(); setEditingLead(lead) }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      aria-label="Elimina lead"
                      onClick={(e) => { e.stopPropagation(); setDeletingLead(lead) }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
```

Aggiornare il `colSpan` dell'EmptyState da `7` a `8` (riga 86) e cambiare `leads.length` in `rows.length` (riga 84):

```tsx
            {rows.length === 0 && (
              <tr>
                <td colSpan={8}>
```

- [ ] **Step 5: Render drawer and confirm dialog**

In `LeadTable.tsx`, dentro il `<div className="space-y-3">` di ritorno, subito prima della sua chiusura `</div>` finale (dopo il blocco paginazione, riga 113), aggiungere:

```tsx
      <LeadEditDrawer
        lead={editingLead}
        open={!!editingLead}
        onClose={() => setEditingLead(null)}
        onSaved={() => { setEditingLead(null); router.refresh() }}
      />

      <Dialog open={!!deletingLead} onOpenChange={(o) => { if (!o) setDeletingLead(null) }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Eliminare lead?</DialogTitle>
            <DialogDescription>
              {deletingLead
                ? (`${deletingLead.nome ?? ''} ${deletingLead.cognome ?? ''}`.trim()
                    || deletingLead.azienda || 'Questo lead')
                : ''}{' '}
              verrà eliminato definitivamente. L&apos;azione non è reversibile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingLead(null)} disabled={deleting}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run __tests__/LeadTable.actions.test.tsx`
Expected: PASS (3 test).

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: nessun errore relativo ai file toccati (ignorare eventuali errori stantii in `.next/types` — rigenerati al build).

- [ ] **Step 8: Commit**

```bash
git add components/leads/LeadTable.tsx __tests__/LeadTable.actions.test.tsx
git commit -m "feat(LeadTable): actions column with quick-edit drawer and delete confirm"
```

---

### Task 4: Hardening — sanitizza `sp.q` in `app/leads/page.tsx`

**Files:**
- Modify: `app/leads/page.tsx`

> `sanitizeSearchTerm` ha già test unitari propri in `lib/search.test.ts`; qui si applica soltanto la funzione, nessun nuovo test.

- [ ] **Step 1: Import the sanitizer**

In `app/leads/page.tsx`, dopo l'import di `computeLeadFields` (riga 5), aggiungere:

```tsx
import { sanitizeSearchTerm } from '@/lib/search'
```

- [ ] **Step 2: Sanitize before the .or() interpolation**

Sostituire il blocco (righe 31-33):

```tsx
  if (sp.q) {
    query = query.or(`nome.ilike.%${sp.q}%,cognome.ilike.%${sp.q}%,azienda.ilike.%${sp.q}%,email.ilike.%${sp.q}%`)
  }
```

con:

```tsx
  const q = sanitizeSearchTerm(sp.q)
  if (q) {
    query = query.or(`nome.ilike.%${q}%,cognome.ilike.%${q}%,azienda.ilike.%${q}%,email.ilike.%${q}%`)
  }
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: nessun nuovo errore.

- [ ] **Step 4: Commit**

```bash
git add app/leads/page.tsx
git commit -m "fix(security): sanitize leads search query before PostgREST or()"
```

---

## Manual Verification (dopo tutti i task)

- [ ] `npm run dev`, aprire `/leads`.
- [ ] Click sulla riga (non sui tastini) → naviga al dettaglio.
- [ ] Click ✎ → drawer da destra con form pre-compilato; NON naviga al dettaglio.
- [ ] Modificare Stadio + Valore, Salva → drawer si chiude, riga aggiornata in lista.
- [ ] Annulla nel drawer → si chiude senza salvare.
- [ ] Click 🗑 (rosso) → popup conferma con nome lead → Elimina → riga sparisce + toast.
- [ ] Annulla nel popup → nessuna eliminazione.
- [ ] Ricerca con testo contenente `,` o `(` → nessun errore, risultati coerenti.

---

## Self-Review Notes

- **Spec coverage:** drawer (Task 2), campi = form completo meno note (Task 2 `hideNote`), colonna Azioni fissa a destra (Task 3), conferma delete popup (Task 3), colonne invariate + Azioni (Task 3), bonus sicurezza `sp.q` (Task 4). Tutte le decisioni dello spec sono coperte.
- **Reuse:** `PATCH`/`DELETE /api/leads/[id]` esistenti; `LeadForm` esistente; primitive `dialog.tsx` esistente per la conferma; `@base-ui/react/dialog` per il drawer.
- **Type consistency:** `onSaved`/`onCancel` definiti in Task 1 e usati con le stesse firme in Task 2/3; `editingLead`/`deletingLead: LeadWithComputed | null` coerenti.
