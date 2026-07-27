# CRM Inbound — Documento di Progetto

**Stato:** 🟡 In corso  
**Deploy:** https://crminboundpietro.vercel.app/  
**Repo:** https://github.com/pielat0895/crm_inbound  
**Ultima modifica:** 2026-05-25

---

## Cos'è

CRM inbound proprietario per gestire lead commerciali. Costruito da zero per sostituire un Google Sheet manuale. Progettato attorno al flusso reale di lavoro: email in arrivo → lead → pipeline → chiusura.

---

## Stack Tecnico

| Layer | Tecnologia |
|-------|-----------|
| Framework | Next.js 16.2.6 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Custom cookie-based (bcryptjs) |
| UI | shadcn/ui + Base UI + Tailwind v4 |
| Tabelle | TanStack Table v8 |
| Grafici | Recharts v3 |
| Drag & Drop | dnd-kit |
| Email | Resend |
| Calendario | Google Calendar API (service account) |
| Deploy | Vercel |
| Automazioni | n8n (self-hosted) |
| Design system | Stitch MCP (indigo palette) |

**Note breaking changes Next.js 16:**
- `middleware.ts` → `proxy.ts` (naming conflict)
- `export const dynamic = 'force-dynamic'` su tutte le pagine con query DB
- Resend: lazy-init client per evitare crash build senza API key

---

## Struttura Codebase

```
app/
  tasks/page.tsx              — task hub (landing): scadenze, follow-up, chiusure, dormienti
  dashboard/page.tsx          — KPI + grafici + filtri
  leads/page.tsx              — lista lead con filtri e paginazione
  leads/[id]/page.tsx         — dettaglio lead (tab layout)
  leads/[id]/LeadDetailTabs   — pill tabs: Info / Note / Timeline / HubSpot
  leads/[id]/NoteTab          — auto-save on blur + "crea task da questa nota"
  leads/new/page.tsx          — creazione lead
  pipeline/page.tsx           — kanban drag & drop
  settings/page.tsx           — import CSV, reset DB
  login/page.tsx              — autenticazione

  api/tasks/                  — CRUD task manuali (POST, PATCH, DELETE)
  api/leads/                  — CRUD leads + stage update
  api/webhook/inbound         — riceve lead da n8n
  api/webhook/sync-engagement — aggiorna touchpoints da n8n
  api/cron/reminders          — digest giornaliero (Vercel cron 7am)
  api/calendar/               — integrazione Google Calendar
  api/search/                 — ricerca globale Cmd+K
  api/admin/import-csv/       — import da CSV
  api/admin/reset-db/         — reset + reimport

components/
  dashboard/
    ChartsSection.tsx         — client wrapper, gestisce tutti i grafici + modal condiviso
    DashboardFilters.tsx      — filtri periodo/owner/stadio/origine (URL params)
    TrendChart.tsx            — trend mensile lead (media mobile 3 mesi)
    PipelineChart.tsx         — deal aperti per stadio
    ConversionChart.tsx       — tasso conversione per origine
    OwnerChart.tsx            — lead per owner (bar orizzontale viola)
    SitoChart.tsx             — donut sito web
    DipendentiChart.tsx       — bar fasce dimensione azienda
    IndustryChart.tsx         — bar orizzontale settore
  tasks/
    TaskFeedView.tsx          — client wrapper, mutazioni ottimistiche + rollback
    TaskSection.tsx           — header sezione con conteggio + lista
    TaskRow.tsx               — riga: checkbox, badge chiusura, snooze, elimina
    ClosingCard.tsx           — card lead prossimo a chiusura (no checkbox)
    NewTaskDialog.tsx         — creazione task
    SnoozeMenu.tsx            — rimanda +1/+3/+7 giorni
    TaskFilters.tsx           — owner + finestre temporali (URL params)
  kanban/
    KanbanBoard.tsx           — drag & drop pipeline
    KanbanCard.tsx            — card con badge origine, valore, giorni apertura, dipendenti
  leads/
    LeadTable.tsx             — TanStack Table con sort server-side
    LeadForm.tsx              — create/edit lead (Field hoistato fuori per evitare focus loss)
    LeadFilters.tsx           — filtri lista lead
    InteractionTimeline.tsx   — timeline interazioni con badge ai_analisi (amber)
  ui/
    SearchModal.tsx           — ricerca globale Cmd+K
    MobileNav.tsx             — sidebar mobile
    EmptyState.tsx            — stati vuoti
    OverdueBadge.tsx          — badge lead scaduti
```

---

## Database Schema (Supabase)

### Tabella `leads`
Campi principali: `id`, `nome`, `cognome`, `azienda`, `email`, `telefono`, `valore`, `stadio_pipeline`, `origine`, `industry`, `dipendenti`, `stato_lead`, `owner`, `note`, `data_creazione`, `data_ultimo_contatto`, `data_chiusura`, `contattato`, `giorni_pipeline`

**Stadi pipeline:** Lead In → Discovery → Proposal Sent → Negotiation → Won → Chiuso Perso

### Tabella `interactions`
`id`, `lead_id`, `tipo`, `body`, `created_at`  
Tipi: `email_inbound`, `email_outbound`, `note`, `stage_change`, `ai_analisi`

### Tabella `settings`
`key`, `value` (config generica)

### Tabella `tasks`
`id`, `created_at`, `titolo`, `note`, `due_date`, `lead_id`, `priorita`, `done`, `done_at`, `owner`  
Task manuali. `lead_id` nullable (task liberi), FK `on delete cascade`. Il feed di `/tasks`
li unisce agli item derivati dai lead. RLS abilitata senza policy: scrive solo il service client.

Campo aggiunto su `leads`: `data_chiusura_prevista` (previsione, distinta da `data_chiusura` effettiva).

---

## Features Completate

### Autenticazione
- Login custom con password hashata (bcryptjs) + cookie di sessione
- Proxy middleware per proteggere tutte le route

### Dashboard
- KPI cards: lead totali, deal aperti, valore pipeline, tasso conversione, giorni medi chiusura
- Filtro periodo (7/30/90/365 giorni o range custom)
- Filtri owner, stadio, origine come URL params
- Tutti i grafici cliccabili → apre modal con lista lead filtrata
- `baseLeads` = allLeadsRaw filtrato per owner/stadio/origine → poi date filter sopra
- Grafici pipeline e dipendenti ignorano date filter (dati strutturali, non temporali)

### Lista Lead
- TanStack Table con sort server-side
- Paginazione server-side
- Filtri: testo libero, stadio, origine, owner
- Export CSV

### Dettaglio Lead
- Header visivo con badge stadio
- Layout 2 colonne
- Pill tabs: Info / Note / Timeline / HubSpot (placeholder)
- Note con auto-save on blur + debounce
- Interaction Timeline con badge colorati per tipo
- Bottone calendario (Google Calendar)
- Elimina lead con conferma inline

### Kanban Pipeline
- Drag & drop dnd-kit
- Card: badge origine colorati, valore, giorni apertura, dipendenti
- Over ID può essere UUID card o stage name (fix drag)

### Import CSV
- Parser RFC 4180
- Validazione email (contiene @)
- Deduplicazione email prima upsert
- Gestione formato italiano valore (virgole come separatore decimali)
- Import 202 lead da CSV v15

### Automazioni n8n

| Workflow | Trigger | Funzione |
|----------|---------|----------|
| CRM_INBOUND | Gmail + cron 6h + lunedì 5am | Sync engagement + Enrich AI |
| CRM Brain [1] Lead Inbound | Gmail trigger | Crea lead da email inbound |
| CRM Brain [3] Follow-up Digest | Cron 7am | Email digest lead urgenti |
| CRM Brain [4] Stage Auto-Updater | Gmail trigger | AI aggiorna stadio pipeline |
| CRM → Google Sheet | Supabase webhook INSERT | Append lead su Sheet |

**Logica automazioni:**
- Sync engagement: ogni 6h → aggiorna `data_ultimo_contatto` Supabase + Sheet
- Enrich touchpoints: ogni lunedì → analisi AI thread Gmail → salva interaction `ai_analisi`
- Follow-up Digest: ogni mattina → email lead urgenti per priorità (🔴🟠🟡)
- Stage Auto-Updater: Gmail reply → AI decide nuovo stage → PATCH + log interaction
- Google Sheet: Supabase webhook `on_lead_insert` → n8n → append riga

### Ricerca Globale
- Cmd+K modal
- Ricerca per nome, azienda, email

### Email Digest
- Resend (sender: `onboarding@resend.dev`)
- Vercel cron ogni mattina ore 7
- Lead urgenti per priorità

### Google Calendar
- Service account (no OAuth user-flow)
- Crea evento da lead detail

---

## Decisioni Tecniche Chiave

| Decisione | Motivo |
|-----------|--------|
| `proxy.ts` non `middleware.ts` | Next.js 16 naming conflict |
| Dedup globale nel task feed | Un lead in una sola sezione: liste ripetute rendono la pagina inutilizzabile |
| Stadi "avanzati" derivati da `settings` | Gli stadi sono configurabili: nessuna lista hardcoded |
| "Fatto" su item derivato scrive sul lead | L'item sparisce perché cambia il dato reale, niente stato fantasma |
| ⚠️ Repo su Desktop sotto sync iCloud | Se `node_modules` viene sfrattata (file dataless), vitest muore con `mmap ETIMEDOUT` e git va in `write error: Operation timed out`. Cura: `rm -rf node_modules && npm ci`, o spostare il repo fuori dalle cartelle sincronizzate |
| `force-dynamic` su pagine DB | Evita stale prerender cache Vercel |
| Resend lazy-init | Build crash senza API key |
| `n8n-nodes-langchain.agent` | Nodi `openAi` base deprecati |
| Analisi AI come Interaction (non campo lead) | Conserva storico multiplo |
| `Field` hoistato fuori `LeadForm` | Evita focus loss su ogni keystroke |
| `ChartsSection` come unico client wrapper | Modal condiviso tra tutti i grafici |
| `DashboardFilters` con URL params | Stato filtri shareable/persistente |

---

## TODO Aperti

- [ ] Verificare Google Sheet si popola con tutti i campi correttamente
- [ ] Fix Follow-up Digest: cambiare filtro da `not.in.(Chiuso...)` a `in.(Lead In,Discovery,Proposal Sent)` nel nodo `Get Open Leads`
- [ ] Integrazione HubSpot Flow 4: auto-create contatto quando lead → Proposal Sent+
- [ ] Eliminare lead fittizi di test (test@fittizio.com, mario.rossi@test.com)

---

## Cronologia Build

| Data | Milestone |
|------|-----------|
| 2026-05-14 | Scaffold iniziale, schema DB, auth, API CRUD, deploy Vercel, import CSV |
| 2026-05-15 | Pipeline stages, sort colonne, mobile sidebar, kanban, empty states, MCP n8n, workflow attivi |
| 2026-05-16 | Fix CSV parser (RFC 4180), import v15 (202 lead), visual redesign indigo (Stitch) |
| 2026-05-18 | Tab layout lead detail, auto-save note, 3 nuovi grafici dashboard, dipendenti → text ranges, fix valore input |
| 2026-05-19 | Tutti i grafici cliccabili con modal, OwnerChart, filtri dashboard owner/stadio/origine, n8n→Google Sheet sync |
