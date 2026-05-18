'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { LeadWithComputed } from '@/types'
import { DEFAULT_PIPELINE_STAGES, ESPERIENZA_US_OPTIONS, ORIGINE_OPTIONS, INDUSTRY_OPTIONS, STATO_LEAD_OPTIONS } from '@/types'

type Props = {
  lead?: LeadWithComputed
  stages?: string[]
  hideNote?: boolean
}

export function LeadForm({ lead, stages = DEFAULT_PIPELINE_STAGES, hideNote }: Props) {
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
    hanno_sito: lead?.hanno_sito != null ? String(lead.hanno_sito) : '',
    company_web: lead?.company_web ?? '',
    esperienza_us: lead?.esperienza_us ?? '',
    stadio_pipeline: lead?.stadio_pipeline ?? 'Lead In',
    stato_lead: lead?.stato_lead ?? '',
    stato: lead?.stato ?? '',
    motivo_lost: lead?.motivo_lost ?? '',
    valore: lead?.valore?.toString() ?? '',
    owner: lead?.owner ?? '',
    data_apertura: lead?.data_apertura ?? '',
    appuntamento: lead?.appuntamento ? lead.appuntamento.slice(0, 16) : '',
    ricontattare: lead?.ricontattare ?? '',
    numero_messaggi: lead?.numero_messaggi?.toString() ?? '0',
    data_chiusura: lead?.data_chiusura ?? '',
    contattato: lead?.contattato ? 'true' : 'false',
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

    // Coerce numeric fields
    if (body.dipendenti) body.dipendenti = parseInt(body.dipendenti as string, 10)
    else delete body.dipendenti
    if (body.valore) body.valore = parseFloat(body.valore as string)
    else delete body.valore
    if (body.numero_messaggi !== undefined) body.numero_messaggi = parseInt(body.numero_messaggi as string, 10) || 0

    // Coerce booleans
    if (body.hanno_sito === 'true') body.hanno_sito = true
    else if (body.hanno_sito === 'false') body.hanno_sito = false
    else delete body.hanno_sito

    if (!body.esperienza_us) delete body.esperienza_us

    body.contattato = body.contattato === 'true'

    // Empty strings → null
    for (const key of Object.keys(body)) {
      if (body[key] === '') body[key] = null
    }

    if (hideNote) delete body.note

    const url = isEdit ? `/api/leads/${lead!.id}` : '/api/leads'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json()
      const msg = data.error ?? 'Errore nel salvataggio'
      setError(msg)
      toast.error(msg)
      setLoading(false)
      return
    }

    const saved = await res.json()
    toast.success(isEdit ? 'Modifiche salvate' : 'Lead creato')
    setLoading(false)
    if (isEdit) {
      router.refresh()
    } else {
      router.push(`/leads/${saved.id}`)
    }
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
          <div className="space-y-1">
            <Label>Origine</Label>
            <Select value={form.origine ?? ''} onValueChange={v => set('origine', v ?? '')}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {ORIGINE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Industry</Label>
            <Select value={form.industry ?? ''} onValueChange={v => set('industry', v ?? '')}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {INDUSTRY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Field label="Dipendenti" name="dipendenti" type="number" />
          <Field label="Sito web aziendale" name="company_web" />
          <div className="space-y-1">
            <Label>Hanno sito</Label>
            <Select value={form.hanno_sito ?? ''} onValueChange={v => set('hanno_sito', v ?? '')}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sì</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Esperienza US</Label>
            <Select value={form.esperienza_us ?? ''} onValueChange={v => set('esperienza_us', v ?? '')}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {ESPERIENZA_US_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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
            <Select value={form.stadio_pipeline ?? 'Lead In'} onValueChange={v => set('stadio_pipeline', v ?? 'Lead In')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {stages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Stato lead</Label>
            <Select value={form.stato_lead ?? ''} onValueChange={v => set('stato_lead', v ?? '')}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {STATO_LEAD_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
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
          <Field label="Data chiusura" name="data_chiusura" type="date" />
          <Field label="Appuntamento" name="appuntamento" type="datetime-local" />
          <Field label="Ricontattare" name="ricontattare" type="date" />
          <div className="space-y-1">
            <Label>Contattato</Label>
            <Select value={form.contattato} onValueChange={v => set('contattato', v ?? 'false')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sì</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Engagement
          <Badge variant="outline" className="ml-2 text-xs font-normal normal-case">Parzialmente sincronizzato da n8n</Badge>
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Numero messaggi" name="numero_messaggi" type="number" />
          {isEdit && (
            <>
              <div className="space-y-1">
                <Label>Ultimo contatto</Label>
                <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted text-sm">
                  <span>{lead?.data_ultimo_contatto ?? '—'}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">n8n</Badge>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Risposto ultima mail</Label>
                <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted text-sm">
                  <span>{lead?.risposto_ultima_mail ? 'Sì' : 'No'}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">n8n</Badge>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Touchpoints</Label>
                <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted text-sm">
                  <span>{lead?.touchpoints ?? 0}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">n8n</Badge>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {!hideNote && (
        <section className="space-y-2">
          <Label htmlFor="note">Note</Label>
          <Textarea id="note" value={form.note} onChange={e => set('note', e.target.value)} rows={4} />
        </section>
      )}

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
