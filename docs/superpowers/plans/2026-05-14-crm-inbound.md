# CRM Inbound Contacts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user CRM with Kanban pipeline, dashboard KPIs, and n8n webhook integration on Next.js + Supabase + Vercel.

**Architecture:** Next.js App Router with Server Components for data fetching and Client Components for interactive UI (Kanban, table). Supabase Realtime pushes lead changes to open browser tabs. Auth via middleware checking a httpOnly cookie set at login.

**Tech Stack:** Next.js 14, Supabase JS v2, shadcn/ui, Tailwind, dnd-kit, TanStack Table v8, Resend, googleapis, bcryptjs, Vitest

---

## File Map

```
app/
├── middleware.ts
├── layout.tsx
├── page.tsx                              → redirect /dashboard
├── login/page.tsx
├── dashboard/page.tsx
├── pipeline/page.tsx
├── leads/page.tsx
├── leads/new/page.tsx
├── leads/[id]/page.tsx
├── settings/page.tsx
└── api/
    ├── auth/login/route.ts
    ├── leads/route.ts
    ├── leads/[id]/route.ts
    ├── leads/[id]/stage/route.ts
    ├── leads/[id]/interactions/route.ts
    ├── webhook/inbound/route.ts
    ├── webhook/sync-engagement/route.ts
    ├── calendar/route.ts
    ├── cron/reminders/route.ts
    └── settings/route.ts

components/
├── kanban/
│   ├── KanbanBoard.tsx
│   └── KanbanCard.tsx
├── leads/
│   ├── LeadForm.tsx
│   ├── LeadTable.tsx
│   └── InteractionTimeline.tsx
└── ui/
    ├── StatsCard.tsx
    ├── OverdueBadge.tsx
    └── Nav.tsx

lib/
├── supabase/
│   ├── client.ts                         → browser client (Realtime)
│   └── server.ts                         → service role client (API routes, Server Components)
├── auth.ts                               → bcrypt helpers
├── webhook-mapping.ts                    → n8n field mapping config
├── calendar.ts                           → Google Calendar helpers
└── email.ts                              → Resend helpers

types/
└── index.ts                              → Lead, Interaction, Settings types

supabase/
└── migrations/
    └── 001_schema.sql

scripts/
└── import-sheet.ts

vercel.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json` (via npx)
- Create: `vitest.config.ts`
- Create: `.env.local`

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd /Users/pietrolatorre/Desktop/New_CRM_2_def
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*"
```

Answer prompts: No to `--turbopack` if asked (use webpack for stability).

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr \
  @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
  @tanstack/react-table \
  bcryptjs \
  resend \
  googleapis \
  lucide-react \
  date-fns

npm install -D @types/bcryptjs vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Init shadcn/ui**

```bash
npx shadcn@latest init
```

Select: Default style, Slate base color, CSS variables yes.

- [ ] **Step 4: Add shadcn components**

```bash
npx shadcn@latest add button input label card badge select textarea dialog table tabs toast
```

- [ ] **Step 5: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 6: Create vitest.setup.ts**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Create .env.local**

```env
ADMIN_PASSWORD_HASH=
AUTH_SECRET=
WEBHOOK_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_SERVICE_ACCOUNT_JSON=
RESEND_API_KEY=
CRON_SECRET=
RESEND_TO_EMAIL=pietrolatorre0895@gmail.com
```

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: project scaffold with Next.js, Supabase, shadcn/ui"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `types/index.ts`
- Create: `types/index.test.ts`

- [ ] **Step 1: Write types**

```typescript
// types/index.ts
export type Lead = {
  id: string
  created_at: string
  nome: string | null
  cognome: string | null
  azienda: string | null
  email: string
  tel: string | null
  ruolo: string | null
  tipo: string | null
  richiesta: string | null
  origine: string | null
  industry: string | null
  dipendenti: number | null
  hanno_sito: boolean | null
  company_web: string | null
  esperienza_us: boolean | null
  stadio_pipeline: string
  stato_lead: string | null
  stato: string | null
  motivo_lost: string | null
  valore: number | null
  owner: string | null
  data_apertura: string | null
  appuntamento: string | null
  ricontattare: string | null
  data_ultimo_contatto: string | null
  numero_messaggi: number
  risposto_ultima_mail: boolean
  touchpoints: number
  note: string | null
}

export type LeadWithComputed = Lead & {
  giorni_ultimo_contatto: number | null
  giorni_aperto: number | null
}

export type Interaction = {
  id: string
  lead_id: string
  created_at: string
  tipo: 'nota' | 'email' | 'chiamata' | 'meeting'
  contenuto: string
}

export type Settings = {
  followup_threshold_days: number
  pipeline_stages: string[]
}

export const DEFAULT_PIPELINE_STAGES = [
  'Nuovo',
  'Contattato',
  'In trattativa',
  'Proposta inviata',
  'Vinto',
  'Perso',
]

export const CLOSED_STAGES = ['Vinto', 'Perso']

export function computeLeadFields(lead: Lead): LeadWithComputed {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const giorni_ultimo_contatto = lead.data_ultimo_contatto
    ? Math.floor((today.getTime() - new Date(lead.data_ultimo_contatto).getTime()) / 86400000)
    : null

  const giorni_aperto = lead.data_apertura
    ? Math.floor((today.getTime() - new Date(lead.data_apertura).getTime()) / 86400000)
    : null

  return { ...lead, giorni_ultimo_contatto, giorni_aperto }
}
```

- [ ] **Step 2: Write tests**

```typescript
// types/index.test.ts
import { describe, it, expect } from 'vitest'
import { computeLeadFields } from './index'
import type { Lead } from './index'

const baseLead: Lead = {
  id: '1', created_at: '2026-01-01', email: 'test@test.com',
  nome: null, cognome: null, azienda: null, tel: null, ruolo: null,
  tipo: null, richiesta: null, origine: null, industry: null,
  dipendenti: null, hanno_sito: null, company_web: null, esperienza_us: null,
  stadio_pipeline: 'Nuovo', stato_lead: null, stato: null, motivo_lost: null,
  valore: null, owner: null, data_apertura: null, appuntamento: null,
  ricontattare: null, data_ultimo_contatto: null,
  numero_messaggi: 0, risposto_ultima_mail: false, touchpoints: 0, note: null,
}

describe('computeLeadFields', () => {
  it('returns null when data_ultimo_contatto is null', () => {
    const result = computeLeadFields(baseLead)
    expect(result.giorni_ultimo_contatto).toBeNull()
  })

  it('computes giorni_ultimo_contatto correctly', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const lead = { ...baseLead, data_ultimo_contatto: yesterday.toISOString().split('T')[0] }
    const result = computeLeadFields(lead)
    expect(result.giorni_ultimo_contatto).toBe(1)
  })

  it('returns 0 when data_ultimo_contatto is today', () => {
    const today = new Date().toISOString().split('T')[0]
    const lead = { ...baseLead, data_ultimo_contatto: today }
    const result = computeLeadFields(lead)
    expect(result.giorni_ultimo_contatto).toBe(0)
  })
})
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run types/index.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add types/
git commit -m "feat: add Lead, Interaction, Settings types with computed fields"
```

---

## Task 3: Supabase Schema + Client

**Files:**
- Create: `supabase/migrations/001_schema.sql`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`

- [ ] **Step 1: Write migration SQL**

```sql
-- supabase/migrations/001_schema.sql

CREATE TABLE leads (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  nome                  text,
  cognome               text,
  azienda               text,
  email                 text UNIQUE,
  tel                   text,
  ruolo                 text,
  tipo                  text,
  richiesta             text,
  origine               text,
  industry              text,
  dipendenti            integer,
  hanno_sito            boolean,
  company_web           text,
  esperienza_us         boolean,
  stadio_pipeline       text NOT NULL DEFAULT 'Nuovo',
  stato_lead            text,
  stato                 text,
  motivo_lost           text,
  valore                numeric(12,2),
  owner                 text,
  data_apertura         date DEFAULT CURRENT_DATE,
  appuntamento          timestamptz,
  ricontattare          date,
  data_ultimo_contatto  date,
  numero_messaggi       integer NOT NULL DEFAULT 0,
  risposto_ultima_mail  boolean NOT NULL DEFAULT false,
  touchpoints           integer NOT NULL DEFAULT 0,
  note                  text
);

CREATE TABLE interactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id    uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  tipo       text NOT NULL CHECK (tipo IN ('nota','email','chiamata','meeting')),
  contenuto  text NOT NULL
);

CREATE TABLE settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO settings (key, value) VALUES
  ('followup_threshold_days', '7'),
  ('pipeline_stages', '["Nuovo","Contattato","In trattativa","Proposta inviata","Vinto","Perso"]');

-- Enable Realtime on leads
ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- Indexes
CREATE INDEX idx_leads_stadio ON leads(stadio_pipeline);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_ricontattare ON leads(ricontattare);
CREATE INDEX idx_interactions_lead ON interactions(lead_id, created_at DESC);
```

- [ ] **Step 2: Run migration in Supabase**

Go to Supabase dashboard → SQL Editor → paste contents of `001_schema.sql` → Run.

Verify: Tables `leads`, `interactions`, `settings` exist. Settings has 2 rows.

- [ ] **Step 3: Create server client**

```typescript
// lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

- [ ] **Step 4: Create browser client**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 5: Fill .env.local with Supabase values**

In Supabase dashboard → Project Settings → API:
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public key
- `SUPABASE_SERVICE_ROLE_KEY` = service_role key (secret — never expose client-side)

- [ ] **Step 6: Commit**

```bash
git add supabase/ lib/supabase/
git commit -m "feat: Supabase schema migration and client setup"
```

---

## Task 4: Auth Middleware + Login

**Files:**
- Create: `middleware.ts`
- Create: `lib/auth.ts`
- Create: `app/api/auth/login/route.ts`
- Create: `app/login/page.tsx`

- [ ] **Step 1: Generate AUTH_SECRET and ADMIN_PASSWORD_HASH**

```bash
# Generate AUTH_SECRET (random string)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ADMIN_PASSWORD_HASH (replace 'yourpassword' with real password)
node -e "const b=require('bcryptjs'); b.hash('yourpassword',10).then(h=>console.log(h))"
```

Copy both values into `.env.local`.

- [ ] **Step 2: Write auth helpers**

```typescript
// lib/auth.ts
import bcrypt from 'bcryptjs'

export async function verifyPassword(input: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH
  if (!hash) return false
  return bcrypt.compare(input, hash)
}

export function verifyAuthToken(token: string | undefined): boolean {
  if (!token) return false
  return token === process.env.AUTH_SECRET
}
```

- [ ] **Step 3: Write login API route**

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Password required' }, { status: 400 })
  }

  const valid = await verifyPassword(password)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('auth_token', process.env.AUTH_SECRET!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}
```

- [ ] **Step 4: Write middleware**

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/auth'

const PUBLIC_PATHS = ['/login', '/api/auth', '/api/webhook', '/api/cron']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('auth_token')?.value
  if (!verifyAuthToken(token)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 5: Write login page**

```typescript
// app/login/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/dashboard')
    } else {
      setError('Password errata')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>CRM — Accesso</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Accesso...' : 'Entra'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 6: Write auth tests**

```typescript
// lib/auth.test.ts
import { describe, it, expect, vi } from 'vitest'
import { verifyAuthToken } from './auth'

describe('verifyAuthToken', () => {
  it('returns false for undefined token', () => {
    expect(verifyAuthToken(undefined)).toBe(false)
  })

  it('returns false for wrong token', () => {
    process.env.AUTH_SECRET = 'correctsecret'
    expect(verifyAuthToken('wrongtoken')).toBe(false)
  })

  it('returns true for correct token', () => {
    process.env.AUTH_SECRET = 'correctsecret'
    expect(verifyAuthToken('correctsecret')).toBe(true)
  })
})
```

- [ ] **Step 7: Run tests**

```bash
npx vitest run lib/auth.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 8: Commit**

```bash
git add middleware.ts lib/auth.ts app/api/auth/ app/login/
git commit -m "feat: auth middleware and login page"
```

---

## Task 5: Settings API

**Files:**
- Create: `app/api/settings/route.ts`
- Create: `lib/settings.ts`

- [ ] **Step 1: Write settings helpers**

```typescript
// lib/settings.ts
import { createServiceClient } from '@/lib/supabase/server'
import type { Settings } from '@/types'

export async function getSettings(): Promise<Settings> {
  const supabase = createServiceClient()
  const { data } = await supabase.from('settings').select('key, value')

  const map: Record<string, string> = {}
  for (const row of data ?? []) map[row.key] = row.value

  return {
    followup_threshold_days: parseInt(map['followup_threshold_days'] ?? '7', 10),
    pipeline_stages: JSON.parse(map['pipeline_stages'] ?? '["Nuovo","Contattato","In trattativa","Proposta inviata","Vinto","Perso"]'),
  }
}

export async function updateSetting(key: string, value: string): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })
}
```

- [ ] **Step 2: Write API route**

```typescript
// app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSettings, updateSetting } from '@/lib/settings'

export async function GET() {
  const settings = await getSettings()
  return NextResponse.json(settings)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()

  if (body.followup_threshold_days !== undefined) {
    const val = parseInt(body.followup_threshold_days, 10)
    if (isNaN(val) || val < 1) {
      return NextResponse.json({ error: 'Invalid threshold' }, { status: 400 })
    }
    await updateSetting('followup_threshold_days', String(val))
  }

  if (body.pipeline_stages !== undefined) {
    if (!Array.isArray(body.pipeline_stages)) {
      return NextResponse.json({ error: 'pipeline_stages must be array' }, { status: 400 })
    }
    await updateSetting('pipeline_stages', JSON.stringify(body.pipeline_stages))
  }

  const settings = await getSettings()
  return NextResponse.json(settings)
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/settings.ts app/api/settings/
git commit -m "feat: settings API route"
```

---

## Task 6: Leads CRUD API

**Files:**
- Create: `app/api/leads/route.ts`
- Create: `app/api/leads/[id]/route.ts`
- Create: `app/api/leads/[id]/stage/route.ts`
- Create: `app/api/leads/[id]/interactions/route.ts`

- [ ] **Step 1: Write GET/POST /api/leads**

```typescript
// app/api/leads/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { computeLeadFields } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const stage = searchParams.get('stage')
  const origine = searchParams.get('origine')
  const q = searchParams.get('q')

  const supabase = createServiceClient()
  let query = supabase.from('leads').select('*').order('created_at', { ascending: false })

  if (stage) query = query.eq('stadio_pipeline', stage)
  if (origine) query = query.eq('origine', origine)
  if (q) query = query.or(`nome.ilike.%${q}%,cognome.ilike.%${q}%,azienda.ilike.%${q}%,email.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json((data ?? []).map(computeLeadFields))
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!body.email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('leads')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(computeLeadFields(data), { status: 201 })
}
```

- [ ] **Step 2: Write GET/PATCH/DELETE /api/leads/[id]**

```typescript
// app/api/leads/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { computeLeadFields } from '@/types'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('leads').select('*').eq('id', params.id).single()

  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(computeLeadFields(data))
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json()
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('leads')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(computeLeadFields(data))
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const { error } = await supabase.from('leads').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Write PATCH /api/leads/[id]/stage**

```typescript
// app/api/leads/[id]/stage/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { stadio_pipeline } = await request.json()

  if (!stadio_pipeline || typeof stadio_pipeline !== 'string') {
    return NextResponse.json({ error: 'stadio_pipeline required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('leads')
    .update({ stadio_pipeline })
    .eq('id', params.id)
    .select('id, stadio_pipeline')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 4: Write GET/POST /api/leads/[id]/interactions**

```typescript
// app/api/leads/[id]/interactions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('lead_id', params.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { tipo, contenuto } = await request.json()

  if (!tipo || !contenuto) {
    return NextResponse.json({ error: 'tipo and contenuto required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('interactions')
    .insert({ lead_id: params.id, tipo, contenuto })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/leads/
git commit -m "feat: leads CRUD API routes"
```

---

## Task 7: Webhook Routes

**Files:**
- Create: `lib/webhook-mapping.ts`
- Create: `lib/webhook-mapping.test.ts`
- Create: `app/api/webhook/inbound/route.ts`
- Create: `app/api/webhook/sync-engagement/route.ts`

- [ ] **Step 1: Write field mapping config and validator**

```typescript
// lib/webhook-mapping.ts

function validateSecret(request: Request): boolean {
  const secret = request.headers.get('x-webhook-secret')
  return secret === process.env.WEBHOOK_SECRET
}

// Maps incoming n8n payload keys to DB column names.
// Only listed keys are accepted — anything else is ignored.
const INBOUND_FIELD_MAP: Record<string, string> = {
  nome: 'nome',
  cognome: 'cognome',
  azienda: 'azienda',
  email: 'email',
  tel: 'tel',
  ruolo: 'ruolo',
  tipo: 'tipo',
  richiesta: 'richiesta',
  origine: 'origine',
  industry: 'industry',
  dipendenti: 'dipendenti',
  hanno_sito: 'hanno_sito',
  company_web: 'company_web',
  esperienza_us: 'esperienza_us',
  stadio_pipeline: 'stadio_pipeline',
  stato_lead: 'stato_lead',
  valore: 'valore',
  owner: 'owner',
  note: 'note',
}

export function mapInboundPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, dbKey] of Object.entries(INBOUND_FIELD_MAP)) {
    if (raw[key] !== undefined) result[dbKey] = raw[key]
  }
  return result
}

export { validateSecret }
```

- [ ] **Step 2: Write tests for mapInboundPayload**

```typescript
// lib/webhook-mapping.test.ts
import { describe, it, expect } from 'vitest'
import { mapInboundPayload } from './webhook-mapping'

describe('mapInboundPayload', () => {
  it('maps known fields', () => {
    const result = mapInboundPayload({ nome: 'Mario', email: 'mario@test.it', unknown_field: 'x' })
    expect(result).toEqual({ nome: 'Mario', email: 'mario@test.it' })
  })

  it('ignores unknown fields', () => {
    const result = mapInboundPayload({ foo: 'bar', baz: 123 })
    expect(result).toEqual({})
  })

  it('preserves email as required field', () => {
    const result = mapInboundPayload({ email: 'test@test.com', nome: 'Test' })
    expect(result.email).toBe('test@test.com')
  })
})
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run lib/webhook-mapping.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 4: Write inbound webhook route**

```typescript
// app/api/webhook/inbound/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { mapInboundPayload, validateSecret } from '@/lib/webhook-mapping'

export async function POST(request: NextRequest) {
  if (!validateSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const raw = await request.json()
  const payload = mapInboundPayload(raw)

  if (!payload.email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('leads')
    .upsert(payload, { onConflict: 'email', ignoreDuplicates: false })
    .select('id, email, stadio_pipeline')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id }, { status: 200 })
}
```

- [ ] **Step 5: Write sync-engagement route**

```typescript
// app/api/webhook/sync-engagement/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateSecret } from '@/lib/webhook-mapping'

type EngagementItem = {
  email: string
  data_ultimo_contatto?: string
  risposto_ultima_mail?: boolean
  touchpoints?: number
}

export async function PATCH(request: NextRequest) {
  if (!validateSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const items: EngagementItem[] = await request.json()
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'Expected array' }, { status: 400 })
  }

  const supabase = createServiceClient()
  let updated = 0
  let skipped = 0

  for (const item of items) {
    if (!item.email) { skipped++; continue }

    const patch: Record<string, unknown> = {}
    if (item.data_ultimo_contatto !== undefined) patch.data_ultimo_contatto = item.data_ultimo_contatto
    if (item.risposto_ultima_mail !== undefined) patch.risposto_ultima_mail = item.risposto_ultima_mail
    if (item.touchpoints !== undefined) patch.touchpoints = item.touchpoints

    const { error, count } = await supabase
      .from('leads')
      .update(patch)
      .eq('email', item.email)

    if (!error && count && count > 0) updated++
    else skipped++
  }

  return NextResponse.json({ updated, skipped })
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/webhook-mapping.ts lib/webhook-mapping.test.ts app/api/webhook/
git commit -m "feat: webhook inbound and sync-engagement routes"
```

---

## Task 8: App Layout + Navigation

**Files:**
- Create: `components/ui/Nav.tsx`
- Modify: `app/layout.tsx`
- Create: `app/page.tsx`

- [ ] **Step 1: Write Nav component**

```typescript
// components/ui/Nav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Kanban, List, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/leads', label: 'Lead', icon: List },
  { href: '/settings', label: 'Impostazioni', icon: Settings },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <nav className="fixed left-0 top-0 h-full w-56 border-r bg-background flex flex-col p-4 gap-1">
      <div className="font-bold text-lg mb-6 px-2">CRM</div>
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            pathname.startsWith(href)
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Update app/layout.tsx**

```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/ui/Nav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = { title: 'CRM Inbound' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={inter.className}>
        <Nav />
        <main className="ml-56 min-h-screen p-6">{children}</main>
      </body>
    </html>
  )
}
```

Note: Nav renders on login page too — fix by checking pathname in layout or wrapping with a conditional. Simplest: add `overflow-hidden` and render Nav only when not on `/login`:

```typescript
// app/layout.tsx  — replace body content
import { NavWrapper } from '@/components/ui/NavWrapper'
// ...
<body className={inter.className}>
  <NavWrapper>{children}</NavWrapper>
</body>
```

```typescript
// components/ui/NavWrapper.tsx
'use client'
import { usePathname } from 'next/navigation'
import { Nav } from './Nav'

export function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showNav = pathname !== '/login'
  return (
    <div className="flex min-h-screen">
      {showNav && <Nav />}
      <main className={showNav ? 'ml-56 flex-1 p-6' : 'flex-1'}>{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Create root redirect**

```typescript
// app/page.tsx
import { redirect } from 'next/navigation'
export default function Home() {
  redirect('/dashboard')
}
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/Nav.tsx components/ui/NavWrapper.tsx app/layout.tsx app/page.tsx
git commit -m "feat: app layout with navigation"
```

---

## Task 9: Dashboard Page

**Files:**
- Create: `components/ui/StatsCard.tsx`
- Create: `app/dashboard/page.tsx`

- [ ] **Step 1: Write StatsCard**

```typescript
// components/ui/StatsCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  title: string
  value: string | number
  subtitle?: string
}

export function StatsCard({ title, value, subtitle }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Write dashboard page**

```typescript
// app/dashboard/page.tsx
import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { StatsCard } from '@/components/ui/StatsCard'
import { computeLeadFields } from '@/types'
import { CLOSED_STAGES } from '@/types'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export default async function DashboardPage() {
  const supabase = createServiceClient()
  const [{ data: leads }, settings] = await Promise.all([
    supabase.from('leads').select('*'),
    getSettings(),
  ])

  const allLeads = (leads ?? []).map(computeLeadFields)
  const openLeads = allLeads.filter(l => !CLOSED_STAGES.includes(l.stadio_pipeline))
  const wonLeads = allLeads.filter(l => l.stadio_pipeline === 'Vinto')
  const conversionRate = allLeads.length > 0
    ? Math.round((wonLeads.length / allLeads.length) * 100)
    : 0

  const avgDaysToClose = wonLeads.filter(l => l.giorni_aperto !== null).length > 0
    ? Math.round(wonLeads.reduce((sum, l) => sum + (l.giorni_aperto ?? 0), 0) / wonLeads.length)
    : 0

  const overdue = openLeads.filter(
    l => l.giorni_ultimo_contatto !== null && l.giorni_ultimo_contatto >= settings.followup_threshold_days
  )

  const today = new Date().toISOString().split('T')[0]
  const todayFollowups = openLeads.filter(l => l.ricontattare === today)

  const leadsByStage = settings.pipeline_stages.map(stage => ({
    stage,
    count: openLeads.filter(l => l.stadio_pipeline === stage).length,
  }))

  const leadsByOrigine: Record<string, number> = {}
  for (const lead of openLeads) {
    if (lead.origine) leadsByOrigine[lead.origine] = (leadsByOrigine[lead.origine] ?? 0) + 1
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard title="Lead aperti" value={openLeads.length} />
        <StatsCard title="Tasso conversione" value={`${conversionRate}%`} subtitle={`${wonLeads.length} vinti`} />
        <StatsCard title="Giorni medi chiusura" value={avgDaysToClose} />
        <StatsCard title="Scaduti follow-up" value={overdue.length} subtitle={`soglia: ${settings.followup_threshold_days}gg`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-3">Lead per stadio</h2>
          <div className="space-y-2">
            {leadsByStage.map(({ stage, count }) => (
              <div key={stage} className="flex justify-between text-sm">
                <span>{stage}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-3">Lead per origine</h2>
          <div className="space-y-2">
            {Object.entries(leadsByOrigine).map(([origine, count]) => (
              <div key={origine} className="flex justify-between text-sm">
                <span>{origine}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <h2 className="font-semibold text-orange-800 mb-3">
            Da ricontattare ({overdue.length})
          </h2>
          <div className="space-y-1">
            {overdue.slice(0, 10).map(lead => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="flex justify-between text-sm hover:underline">
                <span>{lead.nome} {lead.cognome} — {lead.azienda}</span>
                <span className="text-orange-600">{lead.giorni_ultimo_contatto}gg fa</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {todayFollowups.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h2 className="font-semibold text-blue-800 mb-3">Follow-up oggi ({todayFollowups.length})</h2>
          <div className="space-y-1">
            {todayFollowups.map(lead => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="block text-sm hover:underline">
                {lead.nome} {lead.cognome} — {lead.azienda}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Test the dashboard renders**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard`. Verify KPI cards render, no console errors. DB is empty so all values will be 0 — that's expected.

- [ ] **Step 4: Commit**

```bash
git add components/ui/StatsCard.tsx app/dashboard/
git commit -m "feat: dashboard page with KPI cards and overdue widget"
```

---

## Task 10: OverdueBadge Component

**Files:**
- Create: `components/ui/OverdueBadge.tsx`

- [ ] **Step 1: Write component**

```typescript
// components/ui/OverdueBadge.tsx
import { Badge } from '@/components/ui/badge'

type Props = {
  giorni: number | null
  threshold: number
}

export function OverdueBadge({ giorni, threshold }: Props) {
  if (giorni === null) return null
  if (giorni >= threshold) {
    return <Badge variant="destructive">{giorni}gg</Badge>
  }
  if (giorni >= threshold * 0.7) {
    return <Badge variant="outline" className="border-orange-400 text-orange-600">{giorni}gg</Badge>
  }
  return null
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/OverdueBadge.tsx
git commit -m "feat: OverdueBadge component"
```

---

## Task 11: Kanban Pipeline Page

**Files:**
- Create: `components/kanban/KanbanCard.tsx`
- Create: `components/kanban/KanbanBoard.tsx`
- Create: `app/pipeline/page.tsx`

- [ ] **Step 1: Write KanbanCard**

```typescript
// components/kanban/KanbanCard.tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { OverdueBadge } from '@/components/ui/OverdueBadge'
import type { LeadWithComputed } from '@/types'
import { useRouter } from 'next/navigation'

type Props = {
  lead: LeadWithComputed
  threshold: number
}

export function KanbanCard({ lead, threshold }: Props) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { lead },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => router.push(`/leads/${lead.id}`)}
      className="rounded-md border bg-card p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow space-y-1"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm leading-tight">
          {lead.nome} {lead.cognome}
        </p>
        <OverdueBadge giorni={lead.giorni_ultimo_contatto} threshold={threshold} />
      </div>
      {lead.azienda && <p className="text-xs text-muted-foreground">{lead.azienda}</p>}
      <div className="flex gap-2 flex-wrap">
        {lead.origine && (
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{lead.origine}</span>
        )}
        {lead.data_ultimo_contatto && (
          <span className="text-xs text-muted-foreground">
            {new Date(lead.data_ultimo_contatto).toLocaleDateString('it-IT')}
          </span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write KanbanBoard**

```typescript
// components/kanban/KanbanBoard.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { KanbanCard } from './KanbanCard'
import type { LeadWithComputed } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { computeLeadFields } from '@/types'

type Props = {
  initialLeads: LeadWithComputed[]
  stages: string[]
  threshold: number
}

function DroppableColumn({
  stage, leads, threshold,
}: { stage: string; leads: LeadWithComputed[]; threshold: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 min-h-32 rounded-lg border-2 transition-colors ${isOver ? 'border-primary bg-primary/5' : 'border-transparent'}`}
    >
      {leads.map(lead => (
        <KanbanCard key={lead.id} lead={lead} threshold={threshold} />
      ))}
    </div>
  )
}

export function KanbanBoard({ initialLeads, stages, threshold }: Props) {
  const [leads, setLeads] = useState<LeadWithComputed[]>(initialLeads)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, async () => {
        const res = await fetch('/api/leads')
        const updated = await res.json()
        setLeads(updated)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const leadId = active.id as string
    const newStage = over.id as string

    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.stadio_pipeline === newStage) return

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stadio_pipeline: newStage } : l))

    await fetch(`/api/leads/${leadId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stadio_pipeline: newStage }),
    })
  }, [leads])

  const activeLead = leads.find(l => l.id === activeId) ?? null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => {
          const stageLeads = leads.filter(l => l.stadio_pipeline === stage)
          return (
            <div key={stage} className="flex-shrink-0 w-64">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">{stage}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {stageLeads.length}
                </span>
              </div>
              <SortableContext items={stageLeads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                <DroppableColumn stage={stage} leads={stageLeads} threshold={threshold} />
              </SortableContext>
            </div>
          )
        })}
      </div>
      <DragOverlay>
        {activeLead && <KanbanCard lead={activeLead} threshold={threshold} />}
      </DragOverlay>
    </DndContext>
  )
}
```

- [ ] **Step 3: Write pipeline page**

```typescript
// app/pipeline/page.tsx
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

  const computed = (leads ?? []).map(computeLeadFields)

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

- [ ] **Step 4: Test Kanban**

```bash
npm run dev
```

Navigate to `http://localhost:3000/pipeline`. Verify columns render for all 6 stages. Add a test lead manually in Supabase SQL editor and verify it appears. Try drag & drop.

- [ ] **Step 5: Commit**

```bash
git add components/kanban/ app/pipeline/
git commit -m "feat: Kanban pipeline with drag-and-drop and Realtime"
```

---

## Task 12: Lead List Page

**Files:**
- Create: `components/leads/LeadTable.tsx`
- Create: `app/leads/page.tsx`

- [ ] **Step 1: Write LeadTable**

```typescript
// components/leads/LeadTable.tsx
'use client'
import { useState, useMemo } from 'react'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, flexRender,
  type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import type { LeadWithComputed } from '@/types'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { OverdueBadge } from '@/components/ui/OverdueBadge'
import { ArrowUpDown, Download, Plus } from 'lucide-react'

type Props = {
  leads: LeadWithComputed[]
  threshold: number
}

export function LeadTable({ leads, threshold }: Props) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columns: ColumnDef<LeadWithComputed>[] = useMemo(() => [
    {
      accessorKey: 'nome',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
          Nome <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => `${row.original.nome ?? ''} ${row.original.cognome ?? ''}`.trim() || '—',
    },
    { accessorKey: 'azienda', header: 'Azienda', cell: ({ getValue }) => getValue() ?? '—' },
    { accessorKey: 'origine', header: 'Origine', cell: ({ getValue }) => getValue() ?? '—' },
    { accessorKey: 'stadio_pipeline', header: 'Stadio' },
    {
      accessorKey: 'data_ultimo_contatto',
      header: 'Ultimo contatto',
      cell: ({ row }) => {
        const d = row.original.data_ultimo_contatto
        return d ? new Date(d).toLocaleDateString('it-IT') : '—'
      },
    },
    {
      id: 'followup',
      header: 'Follow-up',
      cell: ({ row }) => (
        <OverdueBadge giorni={row.original.giorni_ultimo_contatto} threshold={threshold} />
      ),
    },
    {
      accessorKey: 'valore',
      header: 'Valore',
      cell: ({ getValue }) => {
        const v = getValue() as number | null
        return v != null ? `€${v.toLocaleString('it-IT')}` : '—'
      },
    },
  ], [threshold])

  const table = useReactTable({
    data: leads,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  function exportCSV() {
    const rows = table.getFilteredRowModel().rows
    const headers = ['Nome', 'Azienda', 'Email', 'Origine', 'Stadio', 'Valore']
    const lines = [
      headers.join(','),
      ...rows.map(r => {
        const l = r.original
        return [
          `"${l.nome ?? ''} ${l.cognome ?? ''}"`,
          `"${l.azienda ?? ''}"`,
          `"${l.email}"`,
          `"${l.origine ?? ''}"`,
          `"${l.stadio_pipeline}"`,
          l.valore ?? '',
        ].join(',')
      }),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'leads.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <Input
          placeholder="Cerca nome, azienda, email..."
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" /> CSV
        </Button>
        <Button size="sm" onClick={() => router.push('/leads/new')}>
          <Plus className="h-4 w-4 mr-1" /> Nuovo lead
        </Button>
      </div>

      <div className="rounded-md border overflow-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b bg-muted/50">
                {hg.headers.map(h => (
                  <th key={h.id} className="px-4 py-2 text-left font-medium">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className="border-b cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => router.push(`/leads/${row.original.id}`)}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                  Nessun lead trovato
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write leads list page**

```typescript
// app/leads/page.tsx
import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields } from '@/types'
import { LeadTable } from '@/components/leads/LeadTable'

export default async function LeadsPage() {
  const supabase = createServiceClient()
  const [{ data: leads }, settings] = await Promise.all([
    supabase.from('leads').select('*').order('created_at', { ascending: false }),
    getSettings(),
  ])

  const computed = (leads ?? []).map(computeLeadFields)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Lead</h1>
      <LeadTable leads={computed} threshold={settings.followup_threshold_days} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/leads/LeadTable.tsx app/leads/page.tsx
git commit -m "feat: lead list page with TanStack Table, search, CSV export"
```

---

## Task 13: LeadForm Component

**Files:**
- Create: `components/leads/LeadForm.tsx`
- Create: `app/leads/new/page.tsx`

- [ ] **Step 1: Write LeadForm**

```typescript
// components/leads/LeadForm.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { LeadWithComputed } from '@/types'
import { DEFAULT_PIPELINE_STAGES } from '@/types'

type Props = {
  lead?: LeadWithComputed
  stages?: string[]
}

const READONLY_FIELDS = ['data_ultimo_contatto', 'risposto_ultima_mail', 'touchpoints'] as const

export function LeadForm({ lead, stages = DEFAULT_PIPELINE_STAGES }: Props) {
  const router = useRouter()
  const isEdit = !!lead

  const [form, setForm] = useState({
    nome: lead?.nome ?? '',
    cognome: lead?.cognome ?? '',
    azienda: lead?.azienda ?? '',
    email: lead?.email ?? '',
    tel: lead?.tel ?? '',
    ruolo: lead?.ruolo ?? '',
    tipo: lead?.tipo ?? '',
    richiesta: lead?.richiesta ?? '',
    origine: lead?.origine ?? '',
    industry: lead?.industry ?? '',
    dipendenti: lead?.dipendenti?.toString() ?? '',
    hanno_sito: lead?.hanno_sito?.toString() ?? '',
    company_web: lead?.company_web ?? '',
    esperienza_us: lead?.esperienza_us?.toString() ?? '',
    stadio_pipeline: lead?.stadio_pipeline ?? 'Nuovo',
    stato_lead: lead?.stato_lead ?? '',
    stato: lead?.stato ?? '',
    motivo_lost: lead?.motivo_lost ?? '',
    valore: lead?.valore?.toString() ?? '',
    owner: lead?.owner ?? '',
    data_apertura: lead?.data_apertura ?? '',
    appuntamento: lead?.appuntamento ?? '',
    ricontattare: lead?.ricontattare ?? '',
    numero_messaggi: lead?.numero_messaggi?.toString() ?? '0',
    note: lead?.note ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const body: Record<string, unknown> = { ...form }
    if (body.dipendenti) body.dipendenti = parseInt(body.dipendenti as string, 10)
    if (body.valore) body.valore = parseFloat(body.valore as string)
    if (body.numero_messaggi) body.numero_messaggi = parseInt(body.numero_messaggi as string, 10)
    if (body.hanno_sito === 'true') body.hanno_sito = true
    else if (body.hanno_sito === 'false') body.hanno_sito = false
    else delete body.hanno_sito
    if (body.esperienza_us === 'true') body.esperienza_us = true
    else if (body.esperienza_us === 'false') body.esperienza_us = false
    else delete body.esperienza_us

    // Remove empty strings → null
    for (const key of Object.keys(body)) {
      if (body[key] === '') body[key] = null
    }

    const url = isEdit ? `/api/leads/${lead!.id}` : '/api/leads'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Errore')
      setLoading(false)
      return
    }

    const saved = await res.json()
    router.push(`/leads/${saved.id}`)
    router.refresh()
  }

  function Field({ label, name, type = 'text' }: { label: string; name: keyof typeof form; type?: string }) {
    return (
      <div className="space-y-1">
        <Label htmlFor={name}>{label}</Label>
        <Input
          id={name}
          type={type}
          value={form[name]}
          onChange={e => set(name, e.target.value)}
        />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Identità</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome" name="nome" />
          <Field label="Cognome" name="cognome" />
          <Field label="Azienda" name="azienda" />
          <Field label="Email" name="email" type="email" />
          <Field label="Telefono" name="tel" />
          <Field label="Ruolo" name="ruolo" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Qualificazione</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo" name="tipo" />
          <Field label="Origine" name="origine" />
          <Field label="Industry" name="industry" />
          <Field label="Dipendenti" name="dipendenti" type="number" />
          <Field label="Sito web" name="company_web" />
          <div className="space-y-1">
            <Label>Hanno sito</Label>
            <Select value={form.hanno_sito} onValueChange={v => set('hanno_sito', v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                <SelectItem value="true">Sì</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Esperienza US</Label>
            <Select value={form.esperienza_us} onValueChange={v => set('esperienza_us', v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                <SelectItem value="true">Sì</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="richiesta">Richiesta</Label>
          <Textarea id="richiesta" value={form.richiesta} onChange={e => set('richiesta', e.target.value)} rows={3} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Pipeline</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Stadio</Label>
            <Select value={form.stadio_pipeline} onValueChange={v => set('stadio_pipeline', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {stages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Field label="Stato lead" name="stato_lead" />
          <Field label="Stato" name="stato" />
          <Field label="Motivo lost" name="motivo_lost" />
          <Field label="Valore (€)" name="valore" type="number" />
          <Field label="Owner" name="owner" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Tempi</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Data apertura" name="data_apertura" type="date" />
          <Field label="Appuntamento" name="appuntamento" type="datetime-local" />
          <Field label="Ricontattare" name="ricontattare" type="date" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Engagement
          <Badge variant="outline" className="ml-2 text-xs font-normal">Parzialmente sincronizzato da n8n</Badge>
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Numero messaggi" name="numero_messaggi" type="number" />
          {isEdit && (
            <>
              <div className="space-y-1">
                <Label>Ultimo contatto</Label>
                <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted text-sm">
                  {lead?.data_ultimo_contatto ?? '—'}
                  <Badge variant="secondary" className="ml-auto text-xs">n8n</Badge>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Risposto ultima mail</Label>
                <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted text-sm">
                  {lead?.risposto_ultima_mail ? 'Sì' : 'No'}
                  <Badge variant="secondary" className="ml-auto text-xs">n8n</Badge>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Touchpoints</Label>
                <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted text-sm">
                  {lead?.touchpoints ?? 0}
                  <Badge variant="secondary" className="ml-auto text-xs">n8n</Badge>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" value={form.note} onChange={e => set('note', e.target.value)} rows={4} />
      </section>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvataggio...' : isEdit ? 'Salva modifiche' : 'Crea lead'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annulla
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Write new lead page**

```typescript
// app/leads/new/page.tsx
import { getSettings } from '@/lib/settings'
import { LeadForm } from '@/components/leads/LeadForm'

export default async function NewLeadPage() {
  const settings = await getSettings()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nuovo lead</h1>
      <LeadForm stages={settings.pipeline_stages} />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/leads/LeadForm.tsx app/leads/new/
git commit -m "feat: LeadForm component and new lead page"
```

---

## Task 14: Interaction Timeline

**Files:**
- Create: `components/leads/InteractionTimeline.tsx`

- [ ] **Step 1: Write component**

```typescript
// components/leads/InteractionTimeline.tsx
'use client'
import { useState } from 'react'
import type { Interaction } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

const TIPO_COLORS: Record<string, string> = {
  nota: 'bg-gray-100 text-gray-700',
  email: 'bg-blue-100 text-blue-700',
  chiamata: 'bg-green-100 text-green-700',
  meeting: 'bg-purple-100 text-purple-700',
}

type Props = {
  leadId: string
  interactions: Interaction[]
}

export function InteractionTimeline({ leadId, interactions }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState<Interaction['tipo']>('nota')
  const [contenuto, setContenuto] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAdd() {
    if (!contenuto.trim()) return
    setLoading(true)
    await fetch(`/api/leads/${leadId}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, contenuto }),
    })
    setContenuto('')
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Storico interazioni</h2>
        <Button size="sm" variant="outline" onClick={() => setOpen(o => !o)}>
          <Plus className="h-4 w-4 mr-1" /> Aggiungi
        </Button>
      </div>

      {open && (
        <div className="rounded-md border p-4 space-y-3">
          <Select value={tipo} onValueChange={v => setTipo(v as Interaction['tipo'])}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nota">Nota</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="chiamata">Chiamata</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Contenuto..."
            value={contenuto}
            onChange={e => setContenuto(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={loading}>
              {loading ? 'Salvataggio...' : 'Salva'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Annulla</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {interactions.length === 0 && (
          <p className="text-sm text-muted-foreground">Nessuna interazione ancora.</p>
        )}
        {interactions.map(int => (
          <div key={int.id} className="flex gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_COLORS[int.tipo] ?? ''}`}>
                {int.tipo}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">
                {new Date(int.created_at).toLocaleString('it-IT')}
              </p>
              <p className="text-sm whitespace-pre-wrap">{int.contenuto}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/leads/InteractionTimeline.tsx
git commit -m "feat: InteractionTimeline component"
```

---

## Task 15: Lead Detail Page

**Files:**
- Create: `app/leads/[id]/page.tsx`

- [ ] **Step 1: Write lead detail page**

```typescript
// app/leads/[id]/page.tsx
import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields } from '@/types'
import { LeadForm } from '@/components/leads/LeadForm'
import { InteractionTimeline } from '@/components/leads/InteractionTimeline'
import { Badge } from '@/components/ui/badge'
import { notFound } from 'next/navigation'
import { CalendarButton } from './CalendarButton'

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const [
    { data: lead, error },
    { data: interactions },
    settings,
  ] = await Promise.all([
    supabase.from('leads').select('*').eq('id', params.id).single(),
    supabase.from('interactions').select('*').eq('lead_id', params.id).order('created_at', { ascending: false }),
    getSettings(),
  ])

  if (error || !lead) notFound()

  const computed = computeLeadFields(lead)

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {computed.nome} {computed.cognome}
            {computed.azienda && <span className="text-muted-foreground font-normal ml-2">— {computed.azienda}</span>}
          </h1>
          <div className="flex gap-2 mt-2">
            <Badge>{computed.stadio_pipeline}</Badge>
            {computed.giorni_aperto !== null && (
              <Badge variant="outline">Aperto da {computed.giorni_aperto}gg</Badge>
            )}
            {computed.giorni_ultimo_contatto !== null && computed.giorni_ultimo_contatto >= settings.followup_threshold_days && (
              <Badge variant="destructive">Follow-up scaduto: {computed.giorni_ultimo_contatto}gg</Badge>
            )}
          </div>
        </div>
        {computed.ricontattare && <CalendarButton lead={computed} />}
      </div>

      <LeadForm lead={computed} stages={settings.pipeline_stages} />

      <hr />

      <InteractionTimeline leadId={params.id} interactions={interactions ?? []} />
    </div>
  )
}
```

- [ ] **Step 2: Write CalendarButton client component**

```typescript
// app/leads/[id]/CalendarButton.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import type { LeadWithComputed } from '@/types'

export function CalendarButton({ lead }: { lead: LeadWithComputed }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function createEvent() {
    setLoading(true)
    await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: lead.id }),
    })
    setDone(true)
    setLoading(false)
  }

  return (
    <Button variant="outline" size="sm" onClick={createEvent} disabled={loading || done}>
      <Calendar className="h-4 w-4 mr-1" />
      {done ? 'Evento creato' : loading ? '...' : 'Crea reminder Calendar'}
    </Button>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/leads/[id]/
git commit -m "feat: lead detail page with form and interaction timeline"
```

---

## Task 16: Settings Page

**Files:**
- Create: `app/settings/page.tsx`

- [ ] **Step 1: Write settings page**

```typescript
// app/settings/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Settings } from '@/types'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [threshold, setThreshold] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then((s: Settings) => {
      setSettings(s)
      setThreshold(String(s.followup_threshold_days))
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followup_threshold_days: parseInt(threshold, 10) }),
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    setSaving(false)
  }

  if (!settings) return <p className="text-sm text-muted-foreground">Caricamento...</p>

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">Impostazioni</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Follow-up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="threshold">Soglia giorni senza contatto</Label>
            <div className="flex gap-2">
              <Input
                id="threshold"
                type="number"
                min={1}
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                className="w-24"
              />
              <span className="self-center text-sm text-muted-foreground">giorni</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Lead senza contatto da più di {threshold} giorni vengono evidenziati in rosso.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saved ? 'Salvato!' : saving ? 'Salvataggio...' : 'Salva'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/settings/
git commit -m "feat: settings page"
```

---

## Task 17: Google Calendar Integration

**Files:**
- Create: `lib/calendar.ts`
- Create: `app/api/calendar/route.ts`

- [ ] **Step 1: Write calendar helper**

```typescript
// lib/calendar.ts
import { google } from 'googleapis'

function getCalendarClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  })
  return google.calendar({ version: 'v3', auth })
}

export async function createReminderEvent({
  summary,
  date,
  leadUrl,
  calendarId = 'primary',
}: {
  summary: string
  date: string        // YYYY-MM-DD
  leadUrl: string
  calendarId?: string
}) {
  const calendar = getCalendarClient()

  await calendar.events.insert({
    calendarId,
    requestBody: {
      summary,
      description: `CRM Lead: ${leadUrl}`,
      start: { date },
      end: { date },
      reminders: { useDefault: true },
    },
  })
}
```

- [ ] **Step 2: Write calendar API route**

```typescript
// app/api/calendar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createReminderEvent } from '@/lib/calendar'

export async function POST(request: NextRequest) {
  const { lead_id } = await request.json()
  if (!lead_id) return NextResponse.json({ error: 'lead_id required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: lead, error } = await supabase
    .from('leads').select('nome, cognome, azienda, ricontattare').eq('id', lead_id).single()

  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  if (!lead.ricontattare) return NextResponse.json({ error: 'ricontattare date not set' }, { status: 400 })

  const name = [lead.nome, lead.cognome].filter(Boolean).join(' ') || lead.azienda || 'Lead'
  const summary = `Ricontattare: ${name}${lead.azienda ? ` — ${lead.azienda}` : ''}`
  const leadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/leads/${lead_id}`

  await createReminderEvent({ summary, date: lead.ricontattare, leadUrl })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Add NEXT_PUBLIC_APP_URL to .env.local**

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

(Update to production URL on Vercel.)

- [ ] **Step 4: Set up Google Service Account**

1. Go to [Google Cloud Console](https://console.cloud.google.com) → New Project → Enable Google Calendar API
2. IAM & Admin → Service Accounts → Create Service Account
3. Create JSON key → download file
4. Copy entire file content → set as `GOOGLE_SERVICE_ACCOUNT_JSON` in `.env.local` (single line, no newlines)
5. In Google Calendar → share your calendar with the service account email (give "Make changes to events" permission)

- [ ] **Step 5: Commit**

```bash
git add lib/calendar.ts app/api/calendar/
git commit -m "feat: Google Calendar integration via service account"
```

---

## Task 18: Resend Email + Vercel Cron

**Files:**
- Create: `lib/email.ts`
- Create: `app/api/cron/reminders/route.ts`
- Create: `vercel.json`

- [ ] **Step 1: Write email helper**

```typescript
// lib/email.ts
import { Resend } from 'resend'
import type { LeadWithComputed } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOverdueDigest(leads: LeadWithComputed[]) {
  if (leads.length === 0) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const rows = leads
    .map(l => {
      const name = [l.nome, l.cognome].filter(Boolean).join(' ') || l.azienda || l.email
      return `• <a href="${appUrl}/leads/${l.id}">${name}${l.azienda ? ` — ${l.azienda}` : ''}</a> (${l.giorni_ultimo_contatto}gg fa)`
    })
    .join('<br/>')

  await resend.emails.send({
    from: 'CRM <noreply@yourdomain.com>',
    to: process.env.RESEND_TO_EMAIL!,
    subject: `CRM — ${leads.length} lead da ricontattare`,
    html: `
      <h2>Lead da ricontattare</h2>
      <p>${rows}</p>
      <p><a href="${appUrl}/dashboard">Apri dashboard</a></p>
    `,
  })
}
```

Replace `noreply@yourdomain.com` with a verified Resend sender domain.

- [ ] **Step 2: Write cron route**

```typescript
// app/api/cron/reminders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { computeLeadFields, CLOSED_STAGES } from '@/types'
import { sendOverdueDigest } from '@/lib/email'

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('authorization')
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const [{ data: leads }, settings] = await Promise.all([
    supabase.from('leads').select('*').not('stadio_pipeline', 'in', `(${CLOSED_STAGES.map(s => `"${s}"`).join(',')})`),
    getSettings(),
  ])

  const computed = (leads ?? []).map(computeLeadFields)
  const overdue = computed.filter(
    l => l.giorni_ultimo_contatto !== null && l.giorni_ultimo_contatto >= settings.followup_threshold_days
  )

  await sendOverdueDigest(overdue)

  return NextResponse.json({ sent: overdue.length })
}
```

- [ ] **Step 3: Write vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 7 * * *"
    }
  ]
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/email.ts app/api/cron/ vercel.json
git commit -m "feat: Resend email digest and Vercel cron reminder"
```

---

## Task 19: CSV Migration Script

**Files:**
- Create: `scripts/import-sheet.ts`

- [ ] **Step 1: Write import script**

```typescript
// scripts/import-sheet.ts
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually
import { config } from 'dotenv'
config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Map CSV column headers → DB field names
// Update keys to match your exact Google Sheet column headers
const COLUMN_MAP: Record<string, string> = {
  'Data apertura': 'data_apertura',
  'Nome': 'nome',
  'Cognome': 'cognome',
  'Azienda': 'azienda',
  'Email': 'email',
  'Tel': 'tel',
  'Tipo': 'tipo',
  'Richiesta': 'richiesta',
  'Origine': 'origine',
  'Stato Lead': 'stato_lead',
  'Stadio Pipeline': 'stadio_pipeline',
  'Stato': 'stato',
  'Motivo Lost': 'motivo_lost',
  'Valore': 'valore',
  'Owner': 'owner',
  'Ruolo': 'ruolo',
  'Esperienza US': 'esperienza_us',
  'Appuntamento': 'appuntamento',
  'Ricontattare': 'ricontattare',
  'Industry': 'industry',
  'Hanno sito': 'hanno_sito',
  'Company Web': 'company_web',
  'Dipendenti': 'dipendenti',
  'Note': 'note',
  'Touchpoints': 'touchpoints',
  'Numero messaggi': 'numero_messaggi',
  'Risposto Ultima Mail': 'risposto_ultima_mail',
  'Data Ultimo Contatto': 'data_ultimo_contatto',
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(l => l.trim())
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
  return lines.slice(1).map(line => {
    const values = line.match(/("([^"]*)")|([^,]+)|(?<=,)(?=,|$)/g) ?? []
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? '').replace(/^"|"$/g, '').trim()
    })
    return row
  })
}

function coerce(key: string, value: string): unknown {
  if (value === '' || value === undefined) return null
  if (['dipendenti', 'touchpoints', 'numero_messaggi'].includes(key)) return parseInt(value, 10) || null
  if (key === 'valore') return parseFloat(value.replace(',', '.')) || null
  if (['hanno_sito', 'esperienza_us', 'risposto_ultima_mail'].includes(key)) {
    return value.toLowerCase() === 'sì' || value.toLowerCase() === 'yes' || value === '1' || value.toLowerCase() === 'true'
  }
  return value
}

async function main() {
  const csvPath = resolve(process.cwd(), 'scripts/leads-export.csv')
  const content = readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(content)

  console.log(`Parsed ${rows.length} rows`)

  let inserted = 0
  let skipped = 0

  for (const row of rows) {
    const payload: Record<string, unknown> = {}

    for (const [csvCol, dbCol] of Object.entries(COLUMN_MAP)) {
      if (row[csvCol] !== undefined) {
        payload[dbCol] = coerce(dbCol, row[csvCol])
      }
    }

    if (!payload.email) {
      console.log(`SKIP (no email): ${payload.nome} ${payload.cognome} — ${payload.azienda}`)
      skipped++
      continue
    }

    const { error } = await supabase
      .from('leads')
      .upsert(payload, { onConflict: 'email', ignoreDuplicates: false })

    if (error) {
      console.error(`ERROR: ${payload.email} — ${error.message}`)
      skipped++
    } else {
      inserted++
    }
  }

  console.log(`\nDone. Inserted/updated: ${inserted}, Skipped: ${skipped}`)
}

main().catch(console.error)
```

- [ ] **Step 2: Install dotenv**

```bash
npm install -D dotenv tsx
```

- [ ] **Step 3: Test with sample data**

Export your Google Sheet as CSV → save as `scripts/leads-export.csv`. Update `COLUMN_MAP` keys to match your exact column headers.

```bash
npx tsx scripts/import-sheet.ts
```

Expected output: `Done. Inserted/updated: N, Skipped: 0`

Verify in Supabase Table Editor that leads appear.

- [ ] **Step 4: Add scripts/ to .gitignore**

```bash
echo "scripts/leads-export.csv" >> .gitignore
```

- [ ] **Step 5: Commit**

```bash
git add scripts/import-sheet.ts .gitignore
git commit -m "feat: CSV migration script for Google Sheet import"
```

---

## Task 20: Deploy to Vercel + Configure n8n

**This task is a setup guide — no code to write.**

### 20a — Supabase Realtime (enable anon access for Realtime)

In Supabase dashboard → Authentication → Policies — or simplest: disable RLS on `leads` table since auth is handled by middleware:

```sql
-- Run in Supabase SQL Editor
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
```

### 20b — Vercel Deploy

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/crm-inbound.git
git push -u origin main
```

- [ ] **Step 2: Import project in Vercel**

Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub → select repo.

- [ ] **Step 3: Add environment variables in Vercel**

In Vercel project → Settings → Environment Variables, add all variables from `.env.local`:

```
ADMIN_PASSWORD_HASH
AUTH_SECRET
WEBHOOK_SECRET
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_SERVICE_ACCOUNT_JSON
RESEND_API_KEY
CRON_SECRET
RESEND_TO_EMAIL
NEXT_PUBLIC_APP_URL    ← set to your Vercel URL e.g. https://crm-inbound.vercel.app
```

- [ ] **Step 4: Deploy**

Vercel deploys automatically on push. Verify build passes. Navigate to your Vercel URL → should redirect to `/login`.

### 20c — n8n Configuration

- [ ] **Step 1: Add HTTP Request node to existing n8n flow (new leads)**

In your existing n8n flow, add an HTTP Request node at the end:
- Method: `POST`
- URL: `https://your-crm.vercel.app/api/webhook/inbound`
- Headers: `x-webhook-secret: <your WEBHOOK_SECRET value>`
- Body: JSON with lead fields mapped from your flow data

- [ ] **Step 2: Create new n8n flow for daily engagement sync**

Create a new n8n workflow:
1. Trigger: Schedule node — every day at 07:30
2. Read from your email/calendar/tracking sources
3. Build array of `{ email, data_ultimo_contatto, risposto_ultima_mail, touchpoints }`
4. HTTP Request node:
   - Method: `PATCH`
   - URL: `https://your-crm.vercel.app/api/webhook/sync-engagement`
   - Headers: `x-webhook-secret: <WEBHOOK_SECRET>`
   - Body: the array

- [ ] **Step 3: Test webhook end-to-end**

Trigger the n8n flow manually → verify lead appears in CRM within 10 seconds.

- [ ] **Step 4: Commit vercel.json if not already present**

```bash
git add vercel.json
git commit -m "chore: vercel cron config"
git push
```

---

## Self-Review Checklist

| Spec requirement | Task |
|-----------------|------|
| Webhook n8n → CRM < 10s | Task 7 + Realtime in Task 11 |
| Kanban drag & drop | Task 11 |
| Dashboard KPIs | Task 9 |
| Lead detail all fields editable | Task 13 |
| n8n engagement sync read-only fields | Task 7 (route) + Task 13 (form) |
| Google Calendar reminder | Task 17 |
| Email digest overdue | Task 18 |
| Vercel Cron | Task 18 |
| CSV migration | Task 19 |
| Auth middleware | Task 4 |
| Settings configurable threshold | Task 5 + Task 16 |
| Lead list TanStack Table | Task 12 |
| Interaction timeline | Task 14 |
| Supabase Realtime | Task 11 |
