# CRM Brain — n8n Automation Design
**Date:** 2026-05-15
**Project:** CRM Inbound (crminboundpietro.vercel.app)
**Stack:** n8n (self-hosted), Next.js 16, Supabase, Resend, Gmail OAuth, Lemlist, Fathom

---

## Obiettivo

Automatizzare il ciclo di vita dei lead inbound: acquisizione, aggiornamento engagement, reminder follow-up e avanzamento pipeline — riducendo il lavoro manuale a zero per i casi standard.

---

## Architettura generale

```
SORGENTI                    n8n (CRM Brain)                    CRM API
─────────────────────────────────────────────────────────────────────────
Gmail (nuova email)    ──►  [1] Lead Inbound Flow      ──►  POST /webhook/inbound
Lemlist reply hook     ──►      (AI parse + enrich)

Gmail threads (cron)   ──►  [2] Sync Engagement        ──►  PATCH /webhook/sync-engagement

Supabase leads (cron)  ──►  [3] Follow-up Checker      ──►  Resend email digest

Gmail reply detect     ──►  [4] Stage Auto-Updater     ──►  PATCH /api/leads/{id}/stage
Fathom webhook         ──►      (AI decide stage)
```

4 workflow indipendenti con credenziali condivise: Gmail OAuth, Supabase service key, CRM WEBHOOK_SECRET.

---

## Flow 1 — Lead Inbound

**Trigger:** Gmail watch (polling ogni 5 min, inbox pietrolatorre@urbistat.com) + Lemlist webhook (`emailReplied`)

**Nodi:**
1. `Gmail Trigger` / `Webhook` (Lemlist) — riceve evento
2. `AI Node` (Claude Haiku) — estrae strutturato: nome, cognome, azienda, ruolo, telefono dal corpo email
3. `Set` — merge metadati: email mittente, data, origine (`gmail_inbound` | `lemlist_reply`)
4. `HTTP Request` — POST `https://crminboundpietro.vercel.app/api/webhook/inbound`
   - Header: `x-webhook-secret: {{WEBHOOK_SECRET}}`
   - Body: payload mappato

**Logica CRM (esistente):** upsert by email — se lead esiste aggiorna, se nuovo crea con `stadio_pipeline = 'Lead In'`.

**Output atteso:** ogni email inbound diventa lead nel CRM entro 5 minuti.

---

## Flow 2 — Sync Engagement Gmail

**Trigger:** Cron ogni 6 ore

**Nodi:**
1. `Schedule Trigger` — ogni 6h
2. `Supabase` — legge leads attivi (stadio NOT IN closed stages), seleziona `id, email`
3. `Loop Over Items` — per ogni lead
4. `Gmail` — cerca thread con quell'email negli ultimi 7 giorni
5. `Code` — calcola: `data_ultimo_contatto` (ultima email), `touchpoints` (count messaggi), `risposto_ultima_mail` (bool: ultimo msg da lead)
6. `Aggregate` — raccoglie array bulk
7. `HTTP Request` — PATCH `/api/webhook/sync-engagement`

**Output atteso:** `data_ultimo_contatto`, `touchpoints`, `risposto_ultima_mail` sempre freschi. `giorni_ultimo_contatto` calcolato correttamente nel CRM.

---

## Flow 3 — Follow-up Checker

**Trigger:** Cron ogni mattina ore 7:00 (Europe/Rome)

**Nodi:**
1. `Schedule Trigger`
2. `Supabase` — legge leads aperti con `data_ultimo_contatto` valorizzata
3. `Code` — filtra chi supera la soglia (default: `followup_threshold_days` da settings), raggruppa per urgenza:
   - 🔴 Critico: > 30 giorni
   - 🟠 Urgente: > 14 giorni
   - 🟡 Attenzione: > 7 giorni
4. `If` — se lista vuota → stop
5. `Resend` — manda email digest a `pietrolatorre0895@gmail.com` con tabella HTML ordinata per urgenza

**Relazione con cron Vercel:** il cron Vercel (`/api/cron/reminders`) resta attivo. Questo flow n8n sostituisce il digest con versione più ricca (priorità, tabella HTML, link diretto al lead).

**Output atteso:** email mattutina con leads urgenti ordinati per giorni senza contatto.

---

## Flow 4 — Stage Auto-Updater

**Trigger:** Gmail watch (filtra reply a thread dove il CRM ha un lead con quella email) + Fathom webhook (`call.completed`)

**Nodi:**
1. `Gmail Trigger` / `Webhook` (Fathom)
2. `Supabase` — cerca lead per email mittente, verifica esiste e non è closed
3. `If` — lead trovato? Se no → stop
4. `AI Node` (Claude Sonnet) — analizza corpo email/trascrizione Fathom, determina:
   - Interesse confermato → `Discovery`
   - Ha chiesto proposta / pricing → `Proposal Sent`
   - Ha detto no / non interessato → `Chiuso (Perso)`
   - Call completata positiva → stage successivo
   - Incerto → nessun cambio stage
5. `If` — cambio stage rilevato?
6. `HTTP Request` — PATCH `/api/leads/{id}/stage` con `{ stage: "..." }`
7. `HTTP Request` — POST `/api/leads/{id}/interactions` con summary AI come nota

**Mapping stage:**
| Segnale rilevato | Stage attuale | → Stage nuovo |
|---|---|---|
| Interesse confermato | Lead In | Discovery |
| Richiesta proposta | Discovery | Proposal Sent |
| Risposta positiva call | any | +1 stage |
| Risposta negativa esplicita | any | Chiuso (Perso) |
| Call Fathom completata | Lead In / Discovery | Discovery / Proposal Sent |

**Output atteso:** pipeline si aggiorna automaticamente dopo ogni interazione significativa. Interaction log popolato con summary AI.

---

## Credenziali condivise in n8n

| Credenziale | Usata da | Note |
|---|---|---|
| Gmail OAuth | Flow 1, 2, 4 | Account pietrolatorre@urbistat.com |
| Supabase API | Flow 2, 3, 4 | Service role key |
| CRM Webhook Secret | Flow 1, 2 | Header `x-webhook-secret` |
| Resend API | Flow 3 | Key già in Vercel env |
| Lemlist Webhook | Flow 1 | Configurare in lemlist dashboard |
| Fathom Webhook | Flow 4 | Configurare in Fathom settings |

---

## Endpoint CRM utilizzati

| Flow | Metodo | Endpoint | Payload |
|---|---|---|---|
| 1 | POST | `/api/webhook/inbound` | `{ email, nome, cognome, azienda, ruolo, tel, origine }` |
| 2 | PATCH | `/api/webhook/sync-engagement` | `[{ email, data_ultimo_contatto, touchpoints, risposto_ultima_mail }]` |
| 4 | PATCH | `/api/leads/{id}/stage` | `{ stage: string }` |
| 4 | POST | `/api/leads/{id}/interactions` | `{ tipo, note, data }` |

---

## Ordine di implementazione consigliato

1. **Flow 2** (Sync Engagement) — alto impatto, basso rischio, solo lettura Gmail + PATCH bulk
2. **Flow 1** (Lead Inbound) — crea nuovi lead automaticamente
3. **Flow 3** (Follow-up Checker) — sostituisce digest Vercel con versione ricca
4. **Flow 4** (Stage Auto-Updater) — più complesso, AI decision-making, implementare per ultimo

---

## Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Gmail rate limit | Batch requests, cron 6h non 5min |
| AI stage errato | Aggiorna solo se confidence > soglia, altrimenti skip |
| Loop: CRM aggiorna → Gmail trigger | Filtro: trigger solo su email da lead, non da CRM stesso |
| Lemlist webhook duplicati | Idempotente: upsert by email nel CRM |
