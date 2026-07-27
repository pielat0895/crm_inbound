# Task Hub — Design

**Data:** 2026-07-27
**Stato:** approvato in brainstorming, pronto per planning

## Obiettivo

Una pagina `/tasks` che sia la home operativa del CRM: appena entri vedi cosa devi fare
oggi, cosa arriva, quali deal stanno per chiudersi e quali lead sono fermi da troppo
tempo. Sostituisce il giro manuale tra dashboard, lista lead e kanban per capire "cosa
faccio adesso".

## Decisioni prese

| Decisione | Scelta | Motivo |
|---|---|---|
| Natura dei task | Tabella `tasks` vera + item derivati dai lead | Serve poter scrivere task a mano e spuntarli, non solo leggere dati esistenti |
| "Prossimo a chiusura" | Nuovo campo `data_chiusura_prevista`, con fallback su stadio avanzato | Il campo dà precisione; il fallback copre i lead non compilati |
| Note → task | Solo note marcate esplicitamente (bottone "crea task da questa nota") | Ogni nota come task genererebbe rumore ingestibile |
| Layout | Sezioni separate impilate | Ogni flusso ha semantica e finestra temporale propria |
| Azione su item derivati | Scrive sul lead (no stato fantasma) | L'item sparisce perché il dato è cambiato davvero |
| Routing | `/tasks` in nav, diventa la landing dopo il login | È la "home con le cose da fare" richiesta; la dashboard resta per l'analisi |
| Filtro owner | Sì, opzionale, default "tutti" | Login condiviso, `leads.owner` è testuale |
| Architettura | RSC + funzione pura `lib/tasks.ts` + API routes | Identico ai pattern esistenti, logica testabile con vitest |

## Modello dati

### Nuova tabella `tasks`

```sql
create table tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  titolo text not null,
  note text,
  due_date date,                                       -- null = "prima o poi"
  lead_id uuid references leads(id) on delete cascade, -- null = task libero
  priorita text not null default 'media',              -- alta | media | bassa
  done boolean not null default false,
  done_at timestamptz,
  owner text
);
create index tasks_due_open_idx on tasks (done, due_date);
create index tasks_lead_idx on tasks (lead_id);

alter table tasks enable row level security;  -- nessuna policy = deny-all per anon
```

`on delete cascade`: cancellando un lead spariscono i suoi task. Un task orfano tipo
"richiama ACME" senza il lead è rumore.

RLS senza policy, coerente con `002_enable_rls.sql`: solo il service client scrive,
tutto passa da `/api/*`.

### Nuovo campo su `leads`

```sql
alter table leads add column data_chiusura_prevista date;
```

Distinto da `data_chiusura`, che resta la data di chiusura effettiva.
Editabile da `LeadForm` e dal `LeadEditDrawer`.

### Tipi

`types/index.ts` guadagna `Task`, `TaskPriority = 'alta' | 'media' | 'bassa'`, e il
campo `data_chiusura_prevista` su `Lead`.

## Logica: `lib/tasks.ts`

Funzione pura, `now` iniettabile (stesso stile di `computeLeadFields`):

```ts
buildTaskFeed(
  leads: LeadWithComputed[],
  tasks: Task[],
  settings: Settings,
  filters: { upcomingDays: number; closingDays: number; dormantDays: number; owner?: string },
  now: Date,
): TaskFeed
```

Universo di partenza: lead con `stadio_pipeline` non in `CLOSED_STAGES` (stessa
esclusione del cron reminders), esclusi anche `Cliente` e `Studente` — non sono deal in
corso e riempirebbero i dormienti — più le righe `tasks` con `done = false`. Un task
manuale collegato a un lead escluso resta comunque visibile: l'hai scritto tu apposta.

Nuova costante in `types/index.ts`: `ACTIVE_STAGE_EXCLUSIONS = [...CLOSED_STAGES, 'Cliente', 'Studente']`.

Gli stadi sono configurabili via tabella `settings`, quindi "stadio avanzato" non può
essere una lista hardcoded: è definito come **gli stadi attivi che stanno nell'ultimo
terzo di `settings.pipeline_stages`**, escluse le esclusioni sopra. Con la pipeline di
default ciò significa `Proposal Sent`.

### Sezioni

| Sezione | Cosa entra | Ordinamento |
|---|---|---|
| ⚠️ Da fare ora | task con `due_date <= oggi`; lead con `ricontattare <= oggi`; lead con `appuntamento` = oggi | data crescente (più scaduto in cima), poi priorità |
| 📅 In arrivo | task con `due_date` in `(oggi, oggi+upcomingDays]`; lead con `ricontattare` nella finestra; lead con `appuntamento` nella finestra; task senza `due_date` in coda | data crescente |
| 🎯 Prossimi a chiusura | `data_chiusura_prevista` entro `closingDays`, oppure — se vuota — stadio avanzato (vedi sopra) con `giorni_ultimo_contatto` sotto la soglia follow-up. Le righe dal fallback sono marcate `stimato` | data prevista crescente; i `stimato` in fondo, per valore € decrescente |
| 💤 Dormienti | `giorni_ultimo_contatto >= dormantDays` e nessun task aperto sul lead e nessun `ricontattare` futuro | giorni di silenzio decrescente |

### Deduplicazione (requisito bloccante)

Un lead compare in **una sola** sezione. Precedenza:

```
Da fare ora  >  In arrivo  >  Prossimi a chiusura  >  Dormienti
```

L'informazione soppressa non si perde: una riga in "Da fare ora" il cui lead è anche
closing-soon porta un badge 🎯 con il valore €.

Eccezione voluta: più task manuali sullo stesso lead restano righe distinte — sono task
diversi, non duplicati del lead.

### Filtri

URL params, stesso pattern di `DashboardFilters`: `?upcoming=7&closing=30&dormant=21&owner=X`.
Default: `upcoming=7`, `closing=30`, `dormant=settings.followup_threshold_days`, owner
= tutti.

## UI

```
┌─ /tasks ────────────────────────────────────────────────┐
│  Da fare            [owner: tutti ▾] [+ Nuovo task]     │
│                                                          │
│  ⚠️ DA FARE ORA · 7                                      │
│  ☐ Chiama Mario Rossi · ACME 🎯 €12k    scaduto 2gg  ⋯  │
│  ☐ Ricontattare Luca · Beta Srl              oggi    ⋯  │
│                                                          │
│  📅 IN ARRIVO · 12                        [7 giorni ▾]  │
│  ☐ Appuntamento · Gamma Srl               gio 30     ⋯  │
│                                                          │
│  🎯 PROSSIMI A CHIUSURA · 5              [30 giorni ▾]  │
│  ┌──────────────┐ ┌───────────────┐                     │
│  │ Delta SpA    │ │ Zeta Srl      │  (card, no checkbox)│
│  │ €12.000      │ │ €8.500 stimato│                     │
│  │ Proposal·15ago│ │ ult. cont. 4gg│                    │
│  └──────────────┘ └───────────────┘                     │
│                                                          │
│  💤 DORMIENTI · 23                       [>21 giorni ▾] │
│  Epsilon Srl · 34gg silenzio      [Fatto] [Snooze ▾] ⋯  │
└──────────────────────────────────────────────────────────┘
```

Sezione vuota → `EmptyState` esistente, con messaggio proprio ("Nessuna scadenza oggi").

### Componenti nuovi

| Componente | Responsabilità | Dipende da |
|---|---|---|
| `TaskFeed` | Client wrapper: mutazioni ottimistiche, rollback, `router.refresh()` | riceve `TaskFeed` già costruito dal server |
| `TaskSection` | Header con titolo, conteggio, selettore finestra; rendering righe | `TaskRow` / `ClosingCard` |
| `TaskRow` | Una riga: checkbox, testo, badge, data, menu ⋯ | callback dal `TaskFeed` |
| `ClosingCard` | Card compatta lead in chiusura (no checkbox) | — |
| `NewTaskDialog` | Form nuovo task; autocomplete lead via `/api/search` | — |
| `SnoozeMenu` | +1g / +3g / +7g / data custom | — |

### Azioni

- **Checkbox su task manuale** → `PATCH /api/tasks/[id]` `{done:true}`; riga barrata, poi sparisce.
- **Checkbox su item derivato** → `PATCH /api/leads/[id]`: `data_ultimo_contatto = oggi`,
  `ricontattare = null`; più una `interaction` tipo `nota` ("follow-up completato") così la
  timeline del lead resta il registro unico. Nessuna conferma richiesta — è reversibile
  dal lead.
- **Snooze** → su task cambia `due_date`; su derivato sposta `ricontattare`.
- **⋯** → Apri lead (riusa `LeadEditDrawer`), Modifica task, Elimina task.
- **+ Nuovo task** → dialog con titolo, due date, priorità, lead collegato.
- **Da nota a task** → bottone nel `NoteTab` del lead: precompila il titolo con la prima
  riga della nota, `lead_id` già valorizzato.

## API

Route handlers in `app/api/tasks/`, stesso stile di `app/api/leads/`:

| Metodo | Path | Body / effetto |
|---|---|---|
| POST | `/api/tasks` | `{titolo, note?, due_date?, lead_id?, priorita?, owner?}` → 201 con la riga creata |
| PATCH | `/api/tasks/[id]` | campi parziali; `done:true` setta anche `done_at` |
| DELETE | `/api/tasks/[id]` | 204 |

Protette dal `proxy.ts` esistente: `/api/tasks` non è in `PUBLIC_PATHS`.

Validazione server: `titolo` non vuoto dopo trim, `priorita` nella whitelist, `due_date`
parsabile come data ISO, `lead_id` esistente → altrimenti 400 con messaggio.

## Errori

Update ottimistico in `TaskFeed`; su risposta non-2xx si ripristina lo stato locale
precedente e si mostra un toast `sonner` (già in dipendenze). Le query server-side
falliscono in modo visibile: se Supabase ritorna errore, la pagina mostra un blocco
d'errore invece di sezioni vuote silenziose.

## Test

Vitest, sulla funzione pura con `now` iniettato:

- precedenza di dedup: lead con ricontatto oggi + dormiente da 40gg → appare solo in "Da fare ora"
- confini finestra: `due_date` = ieri / oggi / domani / oggi+upcomingDays / oltre
- closing-soon: con `data_chiusura_prevista` vs fallback stadio; ordine `stimato` in fondo
- dormienti: escluso se ha un task aperto; escluso se ha `ricontattare` futuro
- lead in `CLOSED_STAGES` mai presenti in nessuna sezione
- task senza `due_date` finiscono in coda a "In arrivo", mai in "Da fare ora"

Più i test esistenti che non devono rompersi (`types/index.test.ts`, `lib/*.test.ts`).

## Fuori scope (YAGNI)

- Task ricorrenti, tag, sotto-task
- Assegnazione a utenti reali (l'auth è a password condivisa)
- Notifiche push o email dedicate ai task (il digest cron esistente resta com'è)
- Drag & drop per rischedulare (lo `SnoozeMenu` copre il caso)
