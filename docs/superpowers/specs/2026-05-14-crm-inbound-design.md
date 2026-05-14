# CRM Inbound Contacts — Design Spec
**Date:** 2026-05-14  
**Status:** Approved

---

## Overview

Single-user CRM for managing inbound leads. Replaces Google Sheet as the source of truth. Provides a visual pipeline (Kanban), dashboard KPIs, overdue follow-up alerts, and full lead history. Integrates with an existing n8n automation flow for automatic lead ingestion.

---

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14 App Router |
| Database + Realtime | Supabase (PostgreSQL + Supabase Realtime) |
| Deploy | Vercel |
| UI | shadcn/ui + Tailwind CSS |
| Drag & drop | dnd-kit |
| Table | TanStack Table v8 |
| Email | Resend |
| Calendar | Google Calendar API (Service Account) |
| Auth | Middleware + single password (bcrypt, env var) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js (Vercel)                                       │
│                                                         │
│  /app                                                   │
│  ├── middleware.ts          ← password auth (env var)   │
│  ├── dashboard/             ← Server Component          │
│  ├── pipeline/              ← Client Component          │
│  ├── leads/                 ← Server + Client           │
│  ├── settings/              ← Client Component          │
│  └── api/                                               │
│      ├── webhook/inbound    ← POST from n8n             │
│      ├── leads/             ← CRUD                      │
│      ├── calendar/          ← Google Calendar API       │
│      ├── cron/reminders     ← Vercel Cron 08:00 Rome    │
│      └── settings/          ← read/write settings       │
│                                                         │
└──────────────┬──────────────────────────┬───────────────┘
               │ Supabase JS SDK          │ Supabase Realtime
               ▼                          ▼
┌──────────────────────────┐   ┌─────────────────────────┐
│  Supabase (PostgreSQL)   │   │  Realtime channel        │
│  ├── leads               │◄──│  leads:INSERT/UPDATE     │
│  ├── interactions        │   └─────────────────────────┘
│  └── settings            │
└──────────────────────────┘
```

### Webhook flow (n8n → CRM)
`POST /api/webhook/inbound` → validate `x-webhook-secret` header → upsert on `leads` (keyed on `email`) → Supabase Realtime notifies open clients → card appears in Kanban within <1s.

### Follow-up reminder flow
Vercel Cron hits `/api/cron/reminders` at 08:00 Europe/Rome → queries leads with `giorni_ultimo_contatto >= followup_threshold_days` and stage not in `['Vinto', 'Perso']` → creates Google Calendar event + sends Resend email digest.

### Auth flow
`middleware.ts` intercepts all routes. Checks `auth_token` cookie. Missing → redirect to `/login`. Login = POST form → bcrypt compare against `ADMIN_PASSWORD_HASH` env var → set httpOnly cookie.

---

## Database Schema

### `leads`

```sql
id                      uuid PRIMARY KEY DEFAULT gen_random_uuid()
created_at              timestamptz DEFAULT now()

-- Identity
nome                    text
cognome                 text
azienda                 text
email                   text UNIQUE
tel                     text
ruolo                   text

-- Qualification
tipo                    text
richiesta               text
origine                 text
industry                text
dipendenti              integer
hanno_sito              boolean
company_web             text
esperienza_us           boolean

-- Pipeline
stadio_pipeline         text NOT NULL DEFAULT 'Nuovo'
stato_lead              text
stato                   text
motivo_lost             text
valore                  numeric(12,2)
owner                   text

-- Timing
data_apertura           date DEFAULT CURRENT_DATE
appuntamento            timestamptz
ricontattare            date
data_ultimo_contatto    date

-- Engagement
numero_messaggi         integer DEFAULT 0
risposto_ultima_mail    boolean DEFAULT false
touchpoints             integer DEFAULT 0

-- Free text
note                    text

-- Computed columns (Postgres GENERATED)
giorni_ultimo_contatto  integer GENERATED ALWAYS AS (CURRENT_DATE - data_ultimo_contatto) STORED
giorni_aperto           integer GENERATED ALWAYS AS (CURRENT_DATE - data_apertura) STORED
```

### `interactions`

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
lead_id     uuid REFERENCES leads(id) ON DELETE CASCADE
created_at  timestamptz DEFAULT now()
tipo        text    -- 'nota' | 'email' | 'chiamata' | 'meeting'
contenuto   text
```

### `settings`

```sql
key         text PRIMARY KEY
value       text
updated_at  timestamptz DEFAULT now()
```

Seed: `followup_threshold_days = '7'`

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/webhook/inbound` | POST | Receive lead from n8n. Validates `x-webhook-secret`. Upserts on `email`. |
| `/api/leads` | GET | List leads with optional filters (stage, origine, search query). |
| `/api/leads` | POST | Create lead manually. |
| `/api/leads/[id]` | GET | Single lead detail. |
| `/api/leads/[id]` | PATCH | Update lead fields. Triggers calendar creation if `ricontattare` is set. |
| `/api/leads/[id]` | DELETE | Delete lead. |
| `/api/leads/[id]/interactions` | GET | Lead interaction history. |
| `/api/leads/[id]/interactions` | POST | Add interaction (nota/email/chiamata/meeting). |
| `/api/leads/[id]/stage` | PATCH | Update `stadio_pipeline` only — used by Kanban drag & drop. |
| `/api/webhook/sync-engagement` | PATCH | n8n daily scheduler: batch-update `data_ultimo_contatto`, `risposto_ultima_mail`, `touchpoints` keyed on `email`. Same `x-webhook-secret` auth. Returns `{ updated: N, skipped: M }`. |
| `/api/calendar` | POST | Create Google Calendar event for a lead. |
| `/api/cron/reminders` | GET | Daily cron: query overdue leads → Calendar + Resend digest. |
| `/api/settings` | GET/PATCH | Read/write settings table. |

---

## Pages

```
app/
├── middleware.ts
├── login/page.tsx              → password form
├── page.tsx                    → redirect to /dashboard
├── dashboard/page.tsx          → KPI cards, overdue widget
├── pipeline/page.tsx           → Kanban board (Client Component)
├── leads/page.tsx              → filterable + sortable table
├── leads/new/page.tsx          → new lead form
├── leads/[id]/page.tsx         → lead detail + interaction timeline
└── settings/page.tsx           → followup_threshold_days config
```

---

## Components

| Component | Description |
|-----------|-------------|
| `KanbanBoard` | dnd-kit board with one column per pipeline stage |
| `KanbanCard` | Lead card with overdue badge, last contact date |
| `LeadForm` | Unified form for create + edit (all fields) |
| `InteractionTimeline` | Chronological list of interactions + add form |
| `StatsCard` | Single KPI metric card |
| `LeadTable` | TanStack Table with column filters and full-text search |
| `OverdueBadge` | Visual indicator when `giorni_ultimo_contatto >= threshold` |

---

## Screens

### Dashboard
- KPI cards: open leads, leads by stage, conversion rate, avg days to close, leads by source
- Overdue widget: leads exceeding `followup_threshold_days` with quick links
- Today's follow-ups: leads with `ricontattare = today`

### Pipeline Kanban
- Columns driven by `stadio_pipeline` values (configurable via settings)
- Card shows: nome, azienda, origine, data_ultimo_contatto, OverdueBadge
- Drag & drop calls `PATCH /api/leads/[id]/stage` with optimistic update
- Click card → navigate to `/leads/[id]`
- Supabase Realtime subscription refreshes board on any `leads` change

### Lead Detail
- All fields editable inline or via form
- Read-only fields (synced by n8n): `data_ultimo_contatto`, `risposto_ultima_mail`, `touchpoints` — shown with a "Sincronizzato da n8n" badge, not editable from UI
- Interaction timeline with type filter
- Add interaction button (modal)
- "Crea reminder Calendar" button → calls `/api/calendar`
- Computed fields (giorni_aperto, giorni_ultimo_contatto) shown read-only

### Lead List
- TanStack Table: sortable columns, column filters, full-text search
- Row click → `/leads/[id]`
- "Nuovo lead" button → `/leads/new`
- Export CSV button (client-side from current filtered view)

---

## Integrations

### n8n → CRM: New Lead Webhook
```
URL:    https://<crm-domain>/api/webhook/inbound
Method: POST
Header: x-webhook-secret: <WEBHOOK_SECRET>
Body:   { nome, cognome, email, azienda, origine, ... }
```
Field mapping is defined in a single config object in the route handler. Upsert keyed on `email` prevents duplicates.

### n8n → CRM: Daily Engagement Sync
```
URL:    https://<crm-domain>/api/webhook/sync-engagement
Method: PATCH
Header: x-webhook-secret: <WEBHOOK_SECRET>
Body:   [
  { "email": "...", "data_ultimo_contatto": "YYYY-MM-DD", "risposto_ultima_mail": true, "touchpoints": 5 },
  ...
]
```
n8n scheduler runs once daily, reads from multiple sources, calls this endpoint. Updates only the 3 engagement fields. Returns `{ updated: N, skipped: M }`. Fields are read-only in the CRM UI.

### Google Calendar (Service Account)
- Service Account created in Google Cloud Console
- User shares their Google Calendar with the service account email
- CRM stores `GOOGLE_SERVICE_ACCOUNT_JSON` env var
- Event created: `"Ricontattare: [Nome Azienda]"` on `ricontattare` date, description contains link to lead

### Resend
- Daily digest email listing all overdue leads
- Template: plain list with name, company, days since last contact, CRM link
- Free tier: 3,000 emails/month

### Vercel Cron
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/reminders",
    "schedule": "0 7 * * *"
  }]
}
```
(07:00 UTC = 08:00 Europe/Rome summer time. Cron is validated with `CRON_SECRET` header.)

---

## Environment Variables

```env
ADMIN_PASSWORD_HASH=            # bcrypt hash of admin password
WEBHOOK_SECRET=                 # random string, shared with n8n
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_SERVICE_ACCOUNT_JSON=    # full JSON string of service account credentials
RESEND_API_KEY=
CRON_SECRET=                    # validates Vercel cron calls
```

---

## Data Migration

One-shot script: `scripts/import-sheet.ts`

1. Export Google Sheet as CSV
2. Place at `scripts/leads-export.csv`
3. Run `npx tsx scripts/import-sheet.ts`
4. Script maps CSV columns via a config object → upserts into `leads` keyed on `email`
5. Logs skipped rows (missing email, parse errors)
6. Script uses `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` — never committed

---

## Pipeline Stages (default)

```
Nuovo → Contattato → In trattativa → Proposta inviata → Vinto | Perso
```

Stages are stored as plain `text` in `stadio_pipeline`. The Kanban columns are derived dynamically from the distinct values present in the DB, with a configurable order in `settings`.

---

## Success Criteria

- New leads from n8n appear in Kanban within 10 seconds
- Drag & drop updates stage in real time with optimistic UI
- Daily email digest + Google Calendar event created for overdue leads
- All Google Sheet fields present and editable in UI
- Dashboard shows correct conversion rate, leads by source, overdue count
- CSV import completes without data loss from existing Sheet
