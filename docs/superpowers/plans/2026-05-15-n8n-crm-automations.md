# CRM Brain — n8n Automations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 4 n8n workflows that automate lead lifecycle: inbound capture, engagement sync, follow-up reminders, and stage progression.

**Architecture:** Each workflow is an independent n8n flow deployed via REST API (`https://n8n.srv1063618.hstgr.cloud/api/v1/workflows`). Flows call existing CRM webhook/API endpoints. Order: Flow 2 first (safest, read-only Gmail + bulk PATCH), then 1, 3, 4.

**Tech Stack:** n8n self-hosted, Gmail OAuth2, Supabase HTTP API, OpenAI (OpenRouter), Resend, Next.js CRM API, Lemlist webhooks

---

## Credentials already in n8n (use these IDs)

| Credential | ID | Use |
|---|---|---|
| Gmail personal (pietro.latorre@urbistat.com) | `Op0irvuoNGRJkadF` | Flow 1, 2, 4 |
| Supabase | `UqaVnGLzhy1FyQs3` | Flow 2, 3, 4 |
| OpenAI | `zwT4KWQ2op65P9OG` | Flow 1, 4 |
| Lemlist | `IxYBKGK7c6I99BoP` | Flow 1 |

## Constants (replace before deploying)

```
CRM_BASE = https://crminboundpietro.vercel.app
WEBHOOK_SECRET = <get from Vercel dashboard → Settings → Environment Variables → WEBHOOK_SECRET>
SUPABASE_URL = <get from Vercel env NEXT_PUBLIC_SUPABASE_URL>
SUPABASE_KEY = <get from Vercel env SUPABASE_SERVICE_ROLE_KEY>
N8N_API_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyODNiMjcxNC1mNWJmLTQ2NGEtODU5MC1mZWZkNGYyMTNmOTAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYTNiNWY1MDItNmIyNy00NGJmLWJiZTItM2U2NmI4ZjkwMzYyIiwiaWF0IjoxNzc1NjYyMTQwfQ.7tOBJvF0qekihLm2iNz5U7ttj7IErgJKRpzsMdkYYn4
```

---

## Task 1: Retrieve WEBHOOK_SECRET from Vercel

**Files:** none (env var retrieval)

- [ ] **Step 1.1: Get WEBHOOK_SECRET via Vercel CLI**

```bash
npx vercel env pull --environment=production /tmp/crm.env
grep WEBHOOK_SECRET /tmp/crm.env
```

If Vercel CLI not installed: open `https://vercel.com/dashboard` → project `crminboundpietro` → Settings → Environment Variables → copy `WEBHOOK_SECRET`.

- [ ] **Step 1.2: Test webhook endpoint is reachable**

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://crminboundpietro.vercel.app/api/webhook/inbound \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: WRONG_SECRET" \
  -d '{"email":"test@test.com"}'
```

Expected: `401` (unauthorized — confirms endpoint live and auth working)

- [ ] **Step 1.3: Test with correct secret**

```bash
curl -s \
  -X POST https://crminboundpietro.vercel.app/api/webhook/inbound \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: <YOUR_WEBHOOK_SECRET>" \
  -d '{"email":"n8n-test@example.com","nome":"Test","cognome":"N8N","origine":"test"}'
```

Expected: `{"ok":true,"id":"<uuid>"}`. Delete test lead from Supabase after.

---

## Task 2: Flow 2 — Sync Engagement Gmail (deploy first)

**Why first:** Read-only Gmail + bulk PATCH. Zero risk of duplicate leads. Immediately useful.

**What it does:** Every 6h → reads active leads from Supabase → for each, searches Gmail threads → computes `data_ultimo_contatto`, `touchpoints`, `risposto_ultima_mail` → PATCH `/api/webhook/sync-engagement`

**Files:** n8n workflow (created via API, no local file)

- [ ] **Step 2.1: Create the workflow via API**

Save this JSON to `/tmp/flow2_sync_engagement.json`:

```json
{
  "name": "CRM Brain — [2] Sync Engagement Gmail",
  "active": false,
  "nodes": [
    {
      "id": "schedule-1",
      "name": "Every 6 Hours",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [240, 300],
      "parameters": {
        "rule": {
          "interval": [{ "field": "hours", "hoursInterval": 6 }]
        }
      }
    },
    {
      "id": "supabase-1",
      "name": "Get Active Leads",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [460, 300],
      "parameters": {
        "method": "GET",
        "url": "={{$env.SUPABASE_URL}}/rest/v1/leads",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "apikey", "value": "={{$env.SUPABASE_KEY}}" },
            { "name": "Authorization", "value": "=Bearer {{$env.SUPABASE_KEY}}" },
            { "name": "Prefer", "value": "return=representation" }
          ]
        },
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            { "name": "select", "value": "id,email,data_ultimo_contatto,touchpoints" },
            { "name": "stadio_pipeline", "value": "not.in.(Chiuso (Vinto),Chiuso (Perso))" },
            { "name": "email", "value": "not.is.null" }
          ]
        }
      }
    },
    {
      "id": "loop-1",
      "name": "Loop Over Leads",
      "type": "n8n-nodes-base.splitInBatches",
      "typeVersion": 3,
      "position": [680, 300],
      "parameters": { "batchSize": 1, "options": {} }
    },
    {
      "id": "gmail-search-1",
      "name": "Search Gmail Thread",
      "type": "n8n-nodes-base.gmail",
      "typeVersion": 2.1,
      "position": [900, 300],
      "credentials": { "gmailOAuth2": { "id": "Op0irvuoNGRJkadF", "name": "Personal_mail" } },
      "parameters": {
        "operation": "getAll",
        "resource": "message",
        "returnAll": false,
        "limit": 20,
        "filters": {
          "q": "={{ $json.email }}",
          "readStatus": "all"
        },
        "options": { "attachmentsPrefix": "" }
      }
    },
    {
      "id": "code-1",
      "name": "Compute Engagement",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1120, 300],
      "parameters": {
        "jsCode": "const messages = $input.all();\nconst leadEmail = $('Loop Over Leads').first().json.email;\nconst leadId = $('Loop Over Leads').first().json.id;\n\nif (!messages || messages.length === 0) {\n  return [{ json: { email: leadEmail, _skip: true } }];\n}\n\nconst dates = messages\n  .map(m => m.json?.date ? new Date(m.json.date) : null)\n  .filter(Boolean)\n  .sort((a, b) => b - a);\n\nconst lastDate = dates[0];\nconst touchpoints = messages.length;\n\n// Check if last message is FROM the lead (not from us)\nconst lastMsg = messages.find(m => {\n  const from = m.json?.from ?? '';\n  return from.toLowerCase().includes(leadEmail.toLowerCase());\n});\nconst risposto = !!lastMsg;\n\nreturn [{\n  json: {\n    email: leadEmail,\n    data_ultimo_contatto: lastDate ? lastDate.toISOString().split('T')[0] : null,\n    touchpoints,\n    risposto_ultima_mail: risposto\n  }\n}];"
      }
    },
    {
      "id": "filter-1",
      "name": "Skip If No Data",
      "type": "n8n-nodes-base.filter",
      "typeVersion": 2,
      "position": [1340, 300],
      "parameters": {
        "conditions": {
          "options": { "caseSensitive": false },
          "conditions": [{ "id": "skip-check", "leftValue": "={{ $json._skip }}", "rightValue": true, "operator": { "type": "boolean", "operation": "notEquals" } }]
        }
      }
    },
    {
      "id": "aggregate-1",
      "name": "Aggregate Results",
      "type": "n8n-nodes-base.aggregate",
      "typeVersion": 1,
      "position": [1560, 180],
      "parameters": {
        "aggregate": "aggregateAllItemData",
        "destinationFieldName": "items",
        "options": {}
      }
    },
    {
      "id": "patch-crm-1",
      "name": "PATCH Sync Engagement",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1780, 180],
      "parameters": {
        "method": "PATCH",
        "url": "https://crminboundpietro.vercel.app/api/webhook/sync-engagement",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "x-webhook-secret", "value": "={{ $env.CRM_WEBHOOK_SECRET }}" },
            { "name": "Content-Type", "value": "application/json" }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ $json.items }}"
      }
    }
  ],
  "connections": {
    "Every 6 Hours": { "main": [[{ "node": "Get Active Leads", "type": "main", "index": 0 }]] },
    "Get Active Leads": { "main": [[{ "node": "Loop Over Leads", "type": "main", "index": 0 }]] },
    "Loop Over Leads": { "main": [
      [{ "node": "Search Gmail Thread", "type": "main", "index": 0 }],
      [{ "node": "Aggregate Results", "type": "main", "index": 0 }]
    ]},
    "Search Gmail Thread": { "main": [[{ "node": "Compute Engagement", "type": "main", "index": 0 }]] },
    "Compute Engagement": { "main": [[{ "node": "Skip If No Data", "type": "main", "index": 0 }]] },
    "Skip If No Data": { "main": [[{ "node": "Loop Over Leads", "type": "main", "index": 0 }]] },
    "Aggregate Results": { "main": [[{ "node": "PATCH Sync Engagement", "type": "main", "index": 0 }]] }
  },
  "settings": { "executionOrder": "v1" }
}
```

Deploy:

```bash
curl -s -X POST https://n8n.srv1063618.hstgr.cloud/api/v1/workflows \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @/tmp/flow2_sync_engagement.json | python3 -m json.tool | grep '"id"' | head -1
```

Save the returned workflow ID.

- [ ] **Step 2.2: Set env vars in n8n**

In n8n UI → Settings → Environment Variables, add:
- `SUPABASE_URL` = value from Vercel
- `SUPABASE_KEY` = SUPABASE_SERVICE_ROLE_KEY value from Vercel
- `CRM_WEBHOOK_SECRET` = WEBHOOK_SECRET value from Vercel

- [ ] **Step 2.3: Test manually**

In n8n UI → open "CRM Brain — [2] Sync Engagement Gmail" → click "Execute Workflow". Watch execution. Verify last node returns `{"updated": N, "skipped": M}` where N > 0.

- [ ] **Step 2.4: Activate**

```bash
curl -s -X POST https://n8n.srv1063618.hstgr.cloud/api/v1/workflows/<WORKFLOW_ID>/activate \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

Expected: `{"active":true}`

---

## Task 3: Flow 1 — Lead Inbound (Gmail + Lemlist)

**What it does:** New email in Gmail inbox OR Lemlist reply → AI extracts structured data → POST `/api/webhook/inbound` → lead created/updated in CRM.

- [ ] **Step 3.1: Create workflow**

Save to `/tmp/flow1_lead_inbound.json`:

```json
{
  "name": "CRM Brain — [1] Lead Inbound",
  "active": false,
  "nodes": [
    {
      "id": "gmail-trigger-1",
      "name": "Gmail New Email",
      "type": "n8n-nodes-base.gmailTrigger",
      "typeVersion": 1.2,
      "position": [240, 200],
      "credentials": { "gmailOAuth2": { "id": "Op0irvuoNGRJkadF", "name": "Personal_mail" } },
      "parameters": {
        "pollTimes": { "item": [{ "mode": "everyMinute", "value": 5 }] },
        "filters": { "readStatus": "unread", "sender": "" },
        "options": { "dataPropertyAttachmentsPrefixName": "" }
      }
    },
    {
      "id": "lemlist-webhook-1",
      "name": "Lemlist Reply Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [240, 420],
      "parameters": {
        "httpMethod": "POST",
        "path": "lemlist-inbound",
        "responseMode": "onReceived",
        "responseData": "firstEntryJson"
      },
      "webhookId": "lemlist-inbound-crm"
    },
    {
      "id": "normalize-1",
      "name": "Normalize Input",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [460, 300],
      "parameters": {
        "jsCode": "// Normalize Gmail or Lemlist payload to common format\nconst item = $input.first().json;\n\nlet email = '';\nlet body = '';\nlet subject = '';\nlet source = 'unknown';\n\nif (item.from) {\n  // Gmail format\n  const match = item.from.match(/<(.+?)>/);\n  email = match ? match[1] : item.from;\n  body = item.text || item.snippet || '';\n  subject = item.subject || '';\n  source = 'gmail_inbound';\n} else if (item.campaignId || item.leadEmail) {\n  // Lemlist format\n  email = item.leadEmail || item.email || '';\n  body = item.emailBody || item.replyText || '';\n  subject = item.emailSubject || '';\n  source = 'lemlist_reply';\n}\n\nreturn [{ json: { email, body, subject, source } }];"
      }
    },
    {
      "id": "filter-existing-1",
      "name": "Skip Internal Emails",
      "type": "n8n-nodes-base.filter",
      "typeVersion": 2,
      "position": [680, 300],
      "parameters": {
        "conditions": {
          "conditions": [\n            { \"id\": \"not-internal\", \"leftValue\": \"={{ $json.email }}\", \"rightValue\": \"urbistat.com\", \"operator\": { \"type\": \"string\", \"operation\": \"notContains\" } }\n          ]\n        }\n      }\n    },\n    {\n      \"id\": \"ai-extract-1\",\n      \"name\": \"AI Extract Lead Data\",\n      \"type\": \"@n8n/n8n-nodes-langchain.openAi\",\n      \"typeVersion\": 1.7,\n      \"position\": [900, 300],\n      \"credentials\": { \"openAiApi\": { \"id\": \"zwT4KWQ2op65P9OG\", \"name\": \"KEY_openAI\" } },\n      \"parameters\": {\n        \"resource\": \"text\",\n        \"operation\": \"message\",\n        \"modelId\": { \"__rl\": true, \"value\": \"gpt-4o-mini\", \"mode\": \"list\" },\n        \"messages\": {\n          \"values\": [\n            {\n              \"role\": \"system\",\n              \"content\": \"Extract lead information from email text. Return ONLY a JSON object with these fields (use null for missing): nome, cognome, azienda, ruolo, tel. Rules: nome/cognome from signature or email prefix. Never invent data. If uncertain, use null.\"\n            },\n            {\n              \"role\": \"user\",\n              \"content\": \"=Email from: {{ $json.email }}\\nSubject: {{ $json.subject }}\\nBody:\\n{{ $json.body }}\"\n            }\n          ]\n        },\n        \"options\": { \"responseFormat\": \"json_object\" }\n      }\n    },\n    {\n      \"id\": \"build-payload-1\",\n      \"name\": \"Build CRM Payload\",\n      \"type\": \"n8n-nodes-base.code\",\n      \"typeVersion\": 2,\n      \"position\": [1120, 300],\n      \"parameters\": {\n        \"jsCode\": \"const norm = $('Normalize Input').first().json;\\nconst ai = JSON.parse($input.first().json.message?.content || '{}');\\n\\nreturn [{\\n  json: {\\n    email: norm.email,\\n    nome: ai.nome || null,\\n    cognome: ai.cognome || null,\\n    azienda: ai.azienda || null,\\n    ruolo: ai.ruolo || null,\\n    tel: ai.tel || null,\\n    origine: norm.source,\\n    stadio_pipeline: 'Lead In'\\n  }\\n}];\"\n      }\n    },\n    {\n      \"id\": \"post-crm-1\",\n      \"name\": \"POST to CRM Inbound\",\n      \"type\": \"n8n-nodes-base.httpRequest\",\n      \"typeVersion\": 4.2,\n      \"position\": [1340, 300],\n      \"parameters\": {\n        \"method\": \"POST\",\n        \"url\": \"https://crminboundpietro.vercel.app/api/webhook/inbound\",\n        \"sendHeaders\": true,\n        \"headerParameters\": {\n          \"parameters\": [\n            { \"name\": \"x-webhook-secret\", \"value\": \"={{ $env.CRM_WEBHOOK_SECRET }}\" },\n            { \"name\": \"Content-Type\", \"value\": \"application/json\" }\n          ]\n        },\n        \"sendBody\": true,\n        \"specifyBody\": \"json\",\n        \"jsonBody\": \"={{ $json }}\"\n      }\n    }\n  ],\n  \"connections\": {\n    \"Gmail New Email\": { \"main\": [[{ \"node\": \"Normalize Input\", \"type\": \"main\", \"index\": 0 }]] },\n    \"Lemlist Reply Webhook\": { \"main\": [[{ \"node\": \"Normalize Input\", \"type\": \"main\", \"index\": 0 }]] },\n    \"Normalize Input\": { \"main\": [[{ \"node\": \"Skip Internal Emails\", \"type\": \"main\", \"index\": 0 }]] },\n    \"Skip Internal Emails\": { \"main\": [[{ \"node\": \"AI Extract Lead Data\", \"type\": \"main\", \"index\": 0 }]] },\n    \"AI Extract Lead Data\": { \"main\": [[{ \"node\": \"Build CRM Payload\", \"type\": \"main\", \"index\": 0 }]] },\n    \"Build CRM Payload\": { \"main\": [[{ \"node\": \"POST to CRM Inbound\", \"type\": \"main\", \"index\": 0 }]] }\n  },\n  \"settings\": { \"executionOrder\": \"v1\" }\n}\n```\n\nDeploy:\n\n```bash\ncurl -s -X POST https://n8n.srv1063618.hstgr.cloud/api/v1/workflows \\\n  -H \"X-N8N-API-KEY: $N8N_API_KEY\" \\\n  -H \"Content-Type: application/json\" \\\n  -d @/tmp/flow1_lead_inbound.json | python3 -m json.tool | grep '\"id\"' | head -1\n```\n\n- [ ] **Step 3.2: Configure Lemlist webhook URL**\n\nIn Lemlist dashboard → Settings → Webhooks → Add webhook:\n- URL: `https://n8n.srv1063618.hstgr.cloud/webhook/lemlist-inbound`\n- Events: `emailReplied`\n\n- [ ] **Step 3.3: Test with manual execution**\n\nIn n8n UI → open workflow → click "Test Workflow" → manually trigger "Gmail New Email" with a test payload:\n```json\n{ \"from\": \"Mario Rossi <mario@example.com>\", \"subject\": \"Info servizi\", \"text\": \"Salve, sono Mario Rossi, CEO di Acme Srl. Vorrei informazioni.\" }\n```\nExpected: last node returns `{\"ok\":true,\"id\":\"<uuid>\"}`.\nVerify lead appears in CRM at `https://crminboundpietro.vercel.app/leads`.\n\n- [ ] **Step 3.4: Delete test lead from Supabase**\n\n```bash\ncurl -s -X DELETE \\\n  \"$SUPABASE_URL/rest/v1/leads?email=eq.mario@example.com\" \\\n  -H \"apikey: $SUPABASE_KEY\" \\\n  -H \"Authorization: Bearer $SUPABASE_KEY\"\n```\n\n- [ ] **Step 3.5: Activate**\n\n```bash\ncurl -s -X POST https://n8n.srv1063618.hstgr.cloud/api/v1/workflows/<WORKFLOW_ID>/activate \\\n  -H \"X-N8N-API-KEY: $N8N_API_KEY\"\n```\n\n---\n\n## Task 4: Flow 3 — Follow-up Checker (Enhanced Digest)\n\n**What it does:** Every morning at 07:00 Rome time → reads open leads with overdue follow-up → sends HTML email via Resend grouped by urgency.\n\n**Note:** Vercel cron at `/api/cron/reminders` keeps running. This n8n flow sends a richer digest (urgency groups + lead links). They complement each other.\n\n- [ ] **Step 4.1: Create workflow**\n\nSave to `/tmp/flow3_followup.json`:\n\n```json\n{\n  \"name\": \"CRM Brain — [3] Follow-up Digest\",\n  \"active\": false,\n  \"nodes\": [\n    {\n      \"id\": \"schedule-3\",\n      \"name\": \"Every Morning 7am\",\n      \"type\": \"n8n-nodes-base.scheduleTrigger\",\n      \"typeVersion\": 1.2,\n      \"position\": [240, 300],\n      \"parameters\": {\n        \"rule\": {\n          \"interval\": [{ \"field\": \"cronExpression\", \"expression\": \"0 7 * * *\" }]\n        },\n        \"timezone\": \"Europe/Rome\"\n      }\n    },\n    {\n      \"id\": \"get-leads-3\",\n      \"name\": \"Get Open Leads\",\n      \"type\": \"n8n-nodes-base.httpRequest\",\n      \"typeVersion\": 4.2,\n      \"position\": [460, 300],\n      \"parameters\": {\n        \"method\": \"GET\",\n        \"url\": \"={{ $env.SUPABASE_URL }}/rest/v1/leads\",\n        \"sendHeaders\": true,\n        \"headerParameters\": {\n          \"parameters\": [\n            { \"name\": \"apikey\", \"value\": \"={{ $env.SUPABASE_KEY }}\" },\n            { \"name\": \"Authorization\", \"value\": \"=Bearer {{ $env.SUPABASE_KEY }}\" }\n          ]\n        },\n        \"sendQuery\": true,\n        \"queryParameters\": {\n          \"parameters\": [\n            { \"name\": \"select\", \"value\": \"id,nome,cognome,email,azienda,stadio_pipeline,data_ultimo_contatto\" },\n            { \"name\": \"stadio_pipeline\", \"value\": \"not.in.(Chiuso (Vinto),Chiuso (Perso))\" },\n            { \"name\": \"data_ultimo_contatto\", \"value\": \"not.is.null\" }\n          ]\n        }\n      }\n    },\n    {\n      \"id\": \"code-3\",\n      \"name\": \"Group By Urgency\",\n      \"type\": \"n8n-nodes-base.code\",\n      \"typeVersion\": 2,\n      \"position\": [680, 300],\n      \"parameters\": {\n        \"jsCode\": \"const leads = $input.all().map(i => i.json);\\nconst today = new Date();\\n\\nconst withDays = leads.map(l => {\\n  const last = l.data_ultimo_contatto ? new Date(l.data_ultimo_contatto) : null;\\n  const days = last ? Math.floor((today - last) / 86400000) : null;\\n  return { ...l, days };\\n}).filter(l => l.days !== null && l.days >= 7);\\n\\nconst critico = withDays.filter(l => l.days >= 30).sort((a,b) => b.days - a.days);\\nconst urgente = withDays.filter(l => l.days >= 14 && l.days < 30).sort((a,b) => b.days - a.days);\\nconst attenzione = withDays.filter(l => l.days >= 7 && l.days < 14).sort((a,b) => b.days - a.days);\\n\\nif (withDays.length === 0) return [{ json: { _empty: true } }];\\n\\nconst row = (l) => `<tr><td><a href=\\\"https://crminboundpietro.vercel.app/leads/${l.id}\\\">${l.nome ?? ''} ${l.cognome ?? ''}</a></td><td>${l.azienda ?? '—'}</td><td>${l.stadio_pipeline}</td><td>${l.days}gg</td></tr>`;\\n\\nconst section = (title, emoji, rows) => rows.length === 0 ? '' : `\\n  <h3>${emoji} ${title} (${rows.length})</h3>\\n  <table border=\\\"1\\\" cellpadding=\\\"6\\\" cellspacing=\\\"0\\\" style=\\\"border-collapse:collapse;width:100%\\\">\\n  <tr><th>Lead</th><th>Azienda</th><th>Stage</th><th>Senza contatto</th></tr>\\n  ${rows.map(row).join('')}\\n  </table>`;\\n\\nconst html = `<h2>📋 Follow-up CRM — ${today.toLocaleDateString('it-IT')}</h2>\\n${section('Critico', '🔴', critico)}\\n${section('Urgente', '🟠', urgente)}\\n${section('Attenzione', '🟡', attenzione)}\\n<p style=\\\"color:#666;font-size:12px\\\">Totale: ${withDays.length} lead da ricontattare</p>`;\\n\\nreturn [{ json: { html, total: withDays.length, critico: critico.length, urgente: urgente.length, attenzione: attenzione.length } }];\"\n      }\n    },\n    {\n      \"id\": \"if-empty-3\",\n      \"name\": \"Skip If Nothing\",\n      \"type\": \"n8n-nodes-base.filter\",\n      \"typeVersion\": 2,\n      \"position\": [900, 300],\n      \"parameters\": {\n        \"conditions\": {\n          \"conditions\": [{ \"id\": \"not-empty\", \"leftValue\": \"={{ $json._empty }}\", \"rightValue\": true, \"operator\": { \"type\": \"boolean\", \"operation\": \"notEquals\" } }]\n        }\n      }\n    },\n    {\n      \"id\": \"resend-3\",\n      \"name\": \"Send Digest via Resend\",\n      \"type\": \"n8n-nodes-base.httpRequest\",\n      \"typeVersion\": 4.2,\n      \"position\": [1120, 300],\n      \"parameters\": {\n        \"method\": \"POST\",\n        \"url\": \"https://api.resend.com/emails\",\n        \"sendHeaders\": true,\n        \"headerParameters\": {\n          \"parameters\": [\n            { \"name\": \"Authorization\", \"value\": \"=Bearer {{ $env.RESEND_API_KEY }}\" },\n            { \"name\": \"Content-Type\", \"value\": \"application/json\" }\n          ]\n        },\n        \"sendBody\": true,\n        \"specifyBody\": \"json\",\n        \"jsonBody\": \"={\\\"from\\\": \\\"CRM Inbound <onboarding@resend.dev>\\\", \\\"to\\\": [\\\"pietrolatorre0895@gmail.com\\\"], \\\"subject\\\": \\\"📋 Follow-up CRM — {{ $json.total }} lead da ricontattare\\\", \\\"html\\\": \\\"{{ $json.html }}\\\"}\"\n      }\n    }\n  ],\n  \"connections\": {\n    \"Every Morning 7am\": { \"main\": [[{ \"node\": \"Get Open Leads\", \"type\": \"main\", \"index\": 0 }]] },\n    \"Get Open Leads\": { \"main\": [[{ \"node\": \"Group By Urgency\", \"type\": \"main\", \"index\": 0 }]] },\n    \"Group By Urgency\": { \"main\": [[{ \"node\": \"Skip If Nothing\", \"type\": \"main\", \"index\": 0 }]] },\n    \"Skip If Nothing\": { \"main\": [[{ \"node\": \"Send Digest via Resend\", \"type\": \"main\", \"index\": 0 }]] }\n  },\n  \"settings\": { \"executionOrder\": \"v1\" }\n}\n```\n\nDeploy:\n\n```bash\ncurl -s -X POST https://n8n.srv1063618.hstgr.cloud/api/v1/workflows \\\n  -H \"X-N8N-API-KEY: $N8N_API_KEY\" \\\n  -H \"Content-Type: application/json\" \\\n  -d @/tmp/flow3_followup.json | python3 -m json.tool | grep '\"id\"' | head -1\n```\n\n- [ ] **Step 4.2: Add RESEND_API_KEY to n8n env vars**\n\nIn n8n UI → Settings → Environment Variables:\n- `RESEND_API_KEY` = same key as Vercel env\n\n- [ ] **Step 4.3: Test manually**\n\nIn n8n UI → open workflow → "Execute Workflow". Expected: email received at `pietrolatorre0895@gmail.com` with HTML table of leads grouped by urgency.\n\n- [ ] **Step 4.4: Activate**\n\n```bash\ncurl -s -X POST https://n8n.srv1063618.hstgr.cloud/api/v1/workflows/<WORKFLOW_ID>/activate \\\n  -H \"X-N8N-API-KEY: $N8N_API_KEY\"\n```\n\n---\n\n## Task 5: Flow 4 — Stage Auto-Updater\n\n**What it does:** Gmail detects reply from existing lead → AI reads email → decides new stage → PATCH `/api/leads/{id}/stage` → POST interaction log with AI summary.\n\n**Note:** This is the most complex flow. Build last, after others are running.\n\n- [ ] **Step 5.1: Create workflow**\n\nSave to `/tmp/flow4_stage_updater.json`:\n\n```json\n{\n  \"name\": \"CRM Brain — [4] Stage Auto-Updater\",\n  \"active\": false,\n  \"nodes\": [\n    {\n      \"id\": \"gmail-trigger-4\",\n      \"name\": \"Gmail Reply Trigger\",\n      \"type\": \"n8n-nodes-base.gmailTrigger\",\n      \"typeVersion\": 1.2,\n      \"position\": [240, 300],\n      \"credentials\": { \"gmailOAuth2\": { \"id\": \"Op0irvuoNGRJkadF\", \"name\": \"Personal_mail\" } },\n      \"parameters\": {\n        \"pollTimes\": { \"item\": [{ \"mode\": \"everyMinute\", \"value\": 5 }] },\n        \"filters\": { \"readStatus\": \"unread\" },\n        \"options\": {}\n      }\n    },\n    {\n      \"id\": \"extract-email-4\",\n      \"name\": \"Extract Sender Email\",\n      \"type\": \"n8n-nodes-base.code\",\n      \"typeVersion\": 2,\n      \"position\": [460, 300],\n      \"parameters\": {\n        \"jsCode\": \"const msg = $input.first().json;\\nconst match = (msg.from || '').match(/<(.+?)>/);\\nconst email = match ? match[1] : msg.from;\\nreturn [{ json: { email, subject: msg.subject || '', body: msg.text || msg.snippet || '', threadId: msg.threadId } }];\"\n      }\n    },\n    {\n      \"id\": \"find-lead-4\",\n      \"name\": \"Find Lead in CRM\",\n      \"type\": \"n8n-nodes-base.httpRequest\",\n      \"typeVersion\": 4.2,\n      \"position\": [680, 300],\n      \"parameters\": {\n        \"method\": \"GET\",\n        \"url\": \"={{ $env.SUPABASE_URL }}/rest/v1/leads\",\n        \"sendHeaders\": true,\n        \"headerParameters\": {\n          \"parameters\": [\n            { \"name\": \"apikey\", \"value\": \"={{ $env.SUPABASE_KEY }}\" },\n            { \"name\": \"Authorization\", \"value\": \"=Bearer {{ $env.SUPABASE_KEY }}\" }\n          ]\n        },\n        \"sendQuery\": true,\n        \"queryParameters\": {\n          \"parameters\": [\n            { \"name\": \"select\", \"value\": \"id,email,stadio_pipeline,nome,cognome\" },\n            { \"name\": \"email\", \"value\": \"=eq.{{ $json.email }}\" },\n            { \"name\": \"stadio_pipeline\", \"value\": \"not.in.(Chiuso (Vinto),Chiuso (Perso))\" }\n          ]\n        }\n      }\n    },\n    {\n      \"id\": \"check-lead-4\",\n      \"name\": \"Lead Found?\",\n      \"type\": \"n8n-nodes-base.filter\",\n      \"typeVersion\": 2,\n      \"position\": [900, 300],\n      \"parameters\": {\n        \"conditions\": {\n          \"conditions\": [{ \"id\": \"has-lead\", \"leftValue\": \"={{ $json.id }}\", \"rightValue\": \"\", \"operator\": { \"type\": \"string\", \"operation\": \"notEmpty\" } }]\n        }\n      }\n    },\n    {\n      \"id\": \"ai-stage-4\",\n      \"name\": \"AI Decide Stage\",\n      \"type\": \"@n8n/n8n-nodes-langchain.openAi\",\n      \"typeVersion\": 1.7,\n      \"position\": [1120, 300],\n      \"credentials\": { \"openAiApi\": { \"id\": \"zwT4KWQ2op65P9OG\", \"name\": \"KEY_openAI\" } },\n      \"parameters\": {\n        \"resource\": \"text\",\n        \"operation\": \"message\",\n        \"modelId\": { \"__rl\": true, \"value\": \"gpt-4o-mini\", \"mode\": \"list\" },\n        \"messages\": {\n          \"values\": [\n            {\n              \"role\": \"system\",\n              \"content\": \"You are a CRM assistant. Analyze this email reply from a lead and decide the new pipeline stage.\\n\\nCurrent stage: {{ $('Find Lead in CRM').first().json.stadio_pipeline }}\\nValid stages: Lead In, Discovery, Proposal Sent, Chiuso (Vinto), Chiuso (Perso), Cliente, Studente\\n\\nRules:\\n- 'Chiuso (Perso)': explicit rejection, not interested, stop contact\\n- 'Chiuso (Vinto)': confirmed purchase/deal\\n- 'Proposal Sent': asked for pricing, proposal, quote\\n- 'Discovery': interested, wants more info, asked questions\\n- 'Lead In': generic reply, not enough signal\\n- SAME: if unsure, return current stage unchanged\\n\\nRespond ONLY with JSON: { \\\"new_stage\\\": \\\"...\\\", \\\"summary\\\": \\\"one line summary of the email in Italian\\\", \\\"confidence\\\": \\\"high|medium|low\\\" }\"\n            },\n            {\n              \"role\": \"user\",\n              \"content\": \"=Subject: {{ $('Extract Sender Email').first().json.subject }}\\nEmail body:\\n{{ $('Extract Sender Email').first().json.body }}\"\n            }\n          ]\n        },\n        \"options\": { \"responseFormat\": \"json_object\" }\n      }\n    },\n    {\n      \"id\": \"parse-ai-4\",\n      \"name\": \"Parse AI Response\",\n      \"type\": \"n8n-nodes-base.code\",\n      \"typeVersion\": 2,\n      \"position\": [1340, 300],\n      \"parameters\": {\n        \"jsCode\": \"const ai = JSON.parse($input.first().json.message?.content || '{}');\\nconst lead = $('Find Lead in CRM').first().json;\\nconst email = $('Extract Sender Email').first().json;\\n\\nconst stageChanged = ai.new_stage && ai.new_stage !== lead.stadio_pipeline && ai.confidence !== 'low';\\n\\nreturn [{ json: {\\n  leadId: lead.id,\\n  currentStage: lead.stadio_pipeline,\\n  newStage: ai.new_stage,\\n  summary: ai.summary || 'Risposta email ricevuta',\\n  confidence: ai.confidence,\\n  stageChanged,\\n  email: email.email\\n}}];\"\n      }\n    },\n    {\n      \"id\": \"if-stage-changed-4\",\n      \"name\": \"Stage Changed?\",\n      \"type\": \"n8n-nodes-base.filter\",\n      \"typeVersion\": 2,\n      \"position\": [1560, 300],\n      \"parameters\": {\n        \"conditions\": {\n          \"conditions\": [{ \"id\": \"changed\", \"leftValue\": \"={{ $json.stageChanged }}\", \"rightValue\": true, \"operator\": { \"type\": \"boolean\", \"operation\": \"equals\" } }]\n        }\n      }\n    },\n    {\n      \"id\": \"patch-stage-4\",\n      \"name\": \"PATCH Stage\",\n      \"type\": \"n8n-nodes-base.httpRequest\",\n      \"typeVersion\": 4.2,\n      \"position\": [1780, 200],\n      \"parameters\": {\n        \"method\": \"PATCH\",\n        \"url\": \"=https://crminboundpietro.vercel.app/api/leads/{{ $json.leadId }}/stage\",\n        \"sendHeaders\": true,\n        \"headerParameters\": {\n          \"parameters\": [\n            { \"name\": \"Content-Type\", \"value\": \"application/json\" }\n          ]\n        },\n        \"sendBody\": true,\n        \"specifyBody\": \"json\",\n        \"jsonBody\": \"={ \\\"stadio_pipeline\\\": \\\"{{ $json.newStage }}\\\" }\"\n      }\n    },\n    {\n      \"id\": \"post-interaction-4\",\n      \"name\": \"Log Interaction\",\n      \"type\": \"n8n-nodes-base.httpRequest\",\n      \"typeVersion\": 4.2,\n      \"position\": [1780, 420],\n      \"parameters\": {\n        \"method\": \"POST\",\n        \"url\": \"=https://crminboundpietro.vercel.app/api/leads/{{ $('Parse AI Response').first().json.leadId }}/interactions\",\n        \"sendHeaders\": true,\n        \"headerParameters\": {\n          \"parameters\": [\n            { \"name\": \"Content-Type\", \"value\": \"application/json\" }\n          ]\n        },\n        \"sendBody\": true,\n        \"specifyBody\": \"json\",\n        \"jsonBody\": \"={ \\\"tipo\\\": \\\"email\\\", \\\"contenuto\\\": \\\"{{ $('Parse AI Response').first().json.summary }}\\\" }\"\n      }\n    }\n  ],\n  \"connections\": {\n    \"Gmail Reply Trigger\": { \"main\": [[{ \"node\": \"Extract Sender Email\", \"type\": \"main\", \"index\": 0 }]] },\n    \"Extract Sender Email\": { \"main\": [[{ \"node\": \"Find Lead in CRM\", \"type\": \"main\", \"index\": 0 }]] },\n    \"Find Lead in CRM\": { \"main\": [[{ \"node\": \"Lead Found?\", \"type\": \"main\", \"index\": 0 }]] },\n    \"Lead Found?\": { \"main\": [[{ \"node\": \"AI Decide Stage\", \"type\": \"main\", \"index\": 0 }]] },\n    \"AI Decide Stage\": { \"main\": [[{ \"node\": \"Parse AI Response\", \"type\": \"main\", \"index\": 0 }]] },\n    \"Parse AI Response\": { \"main\": [[{ \"node\": \"Stage Changed?\", \"type\": \"main\", \"index\": 0 }]] },\n    \"Stage Changed?\": { \"main\": [\n      [{ \"node\": \"PATCH Stage\", \"type\": \"main\", \"index\": 0 }],\n      [{ \"node\": \"Log Interaction\", \"type\": \"main\", \"index\": 0 }]\n    ]}\n  },\n  \"settings\": { \"executionOrder\": \"v1\" }\n}\n```\n\n**Note:** `PATCH Stage` and `Log Interaction` run in parallel (both triggered by `Stage Changed?` output). The `/api/leads/{id}/stage` endpoint uses `stadio_pipeline` field. The `/api/leads/{id}/interactions` endpoint requires `tipo` + `contenuto`.\n\nDeploy:\n\n```bash\ncurl -s -X POST https://n8n.srv1063618.hstgr.cloud/api/v1/workflows \\\n  -H \"X-N8N-API-KEY: $N8N_API_KEY\" \\\n  -H \"Content-Type: application/json\" \\\n  -d @/tmp/flow4_stage_updater.json | python3 -m json.tool | grep '\"id\"' | head -1\n```\n\n- [ ] **Step 5.2: Test manually**\n\nIn n8n UI → "Execute Workflow" → inject test message for an existing lead email:\n```json\n{ \"from\": \"Lead Name <existing-lead@example.com>\", \"subject\": \"Re: Proposta\", \"text\": \"Sì, mi interessa procedere con la proposta. Possiamo sentirci questa settimana?\", \"threadId\": \"abc123\" }\n```\nExpected: stage updated to `Proposal Sent` in CRM + interaction logged.\n\n- [ ] **Step 5.3: Verify in CRM**\n\nOpen `https://crminboundpietro.vercel.app/leads/<id>` → check `stadio_pipeline` updated + interaction timeline shows AI summary.\n\n- [ ] **Step 5.4: Activate**\n\n```bash\ncurl -s -X POST https://n8n.srv1063618.hstgr.cloud/api/v1/workflows/<WORKFLOW_ID>/activate \\\n  -H \"X-N8N-API-KEY: $N8N_API_KEY\"\n```\n\n---\n\n## Task 6: Verify All Flows Active\n\n- [ ] **Step 6.1: Check all 4 workflows active**\n\n```bash\ncurl -s -H \"X-N8N-API-KEY: $N8N_API_KEY\" \\\n  \"https://n8n.srv1063618.hstgr.cloud/api/v1/workflows?limit=10\" | \\\n  python3 -c \"import json,sys; [print(f\\\"{w['name']} | active={w['active']}\\\") for w in json.load(sys.stdin).get('data',[]) if 'CRM Brain' in w['name']]\"\n```\n\nExpected output:\n```\nCRM Brain — [1] Lead Inbound | active=True\nCRM Brain — [2] Sync Engagement Gmail | active=True\nCRM Brain — [3] Follow-up Digest | active=True\nCRM Brain — [4] Stage Auto-Updater | active=True\n```\n\n- [ ] **Step 6.2: Monitor first real execution**\n\nIn n8n UI → Executions tab → filter by workflow → verify no errors in first 24h.\n"
