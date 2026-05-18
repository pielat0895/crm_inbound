# Lead Detail — Tab Layout

**Date:** 2026-05-18
**Status:** Approved

## Overview

Replace the current two-column layout (LeadForm left, InteractionTimeline right) with a pill-tab navigation on the left and a permanently visible InteractionTimeline on the right.

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Header card (name, company, badges, email, phone, actions) │
├──────────────────────────────────────┬──────────────────────┤
│  [Dettagli] [Note] [HubSpot presto]  │  InteractionTimeline │
│                                      │  (always visible)    │
│  Tab content area                    │                      │
│                                      │                      │
└──────────────────────────────────────┴──────────────────────┘
```

- Grid: `lg:grid-cols-[1fr_360px]` (same as today)
- Pill tabs rendered above the left column content
- Right column: `InteractionTimeline` — no changes to this component

## Pill Tabs

Three tabs, rendered as a segmented pill control (`bg-muted` container, active tab gets `bg-white shadow-sm`):

| Tab | Label | Badge |
|-----|-------|-------|
| 1 | Dettagli | — |
| 2 | Note | — |
| 3 | HubSpot | "presto" (indigo pill) |

State managed with `useState<'dettagli' | 'note' | 'hubspot'>('dettagli')` in a new client wrapper component (`LeadDetailTabs`).

## Tab: Dettagli

Renders `<LeadForm>` exactly as today, **minus** the `note` field (moved to the Note tab).

`LeadForm` receives a new prop `hideNote?: boolean`. When `true`, the Note section is not rendered and `note` is excluded from the submit payload. One-line change to the component.

## Tab: Note

A standalone note editor. Does **not** share the LeadForm submit button.

- `<Textarea>` bound to local state, pre-filled with `lead.note`
- Auto-save on `onBlur`: fires `PATCH /api/leads/:id` with `{ note: value }`
- Visual feedback: a small "Salvato ✓" text fades in for 2 seconds after a successful save, "Errore" on failure
- No explicit save button

Implementation: new component `NoteTab.tsx` (client component). Uses `useState` + `useCallback` for the blur handler.

## Tab: HubSpot

Placeholder card only. Not wired to any API yet — activated by Flow 4 integration.

UI:
```
┌─────────────────────────────────────────┐
│  🔗  HubSpot                            │
│  Contatto non ancora sincronizzato.     │
│  Si attiverà automaticamente quando     │
│  il lead raggiungerà Proposal Sent+.    │
│                                         │
│  [Collega manualmente] (disabled)       │
└─────────────────────────────────────────┘
```

Implementation: inline JSX in `LeadDetailTabs`, no separate component needed.

## Component Structure

```
app/leads/[id]/
  page.tsx                  (server component — no changes to data fetching)
  LeadDetailTabs.tsx        (NEW — client component, owns tab state)
  NoteTab.tsx               (NEW — client component, note auto-save)
  CalendarButton.tsx        (unchanged)
  DeleteLeadButton.tsx      (unchanged)

components/leads/
  LeadForm.tsx              (add hideNote?: boolean prop)
```

`page.tsx` passes `lead`, `interactions`, and `settings` to `<LeadDetailTabs>`, which replaces the current two-column JSX block. The header card stays in `page.tsx` (server-rendered).

## Data Flow

- **Dettagli save**: unchanged — full PATCH via LeadForm submit
- **Note auto-save**: `PATCH /api/leads/:id` with `{ note }` only, on blur
- **HubSpot tab**: no API calls

## API Changes

None. `PATCH /api/leads/:id` already accepts partial payloads.

## What Does Not Change

- Header card layout and actions
- InteractionTimeline component
- Data fetching in `page.tsx`
- All other LeadForm fields and validation
- Kanban pipeline, lead list, dashboard
