'use client'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { Settings } from '@/types'
import { Trash2, Upload, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [threshold, setThreshold] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [probabilities, setProbabilities] = useState<Record<string, string>>({})
  const [savingProbs, setSavingProbs] = useState(false)
  const [savedProbs, setSavedProbs] = useState(false)

  // Reset DB
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  // Import CSV
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((s: Settings) => {
        setSettings(s)
        setThreshold(String(s.followup_threshold_days))
        const probs: Record<string, string> = {}
        for (const stage of s.pipeline_stages) {
          probs[stage] = String(s.pipeline_stage_probabilities[stage] ?? 0)
        }
        setProbabilities(probs)
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

  async function handleSaveProbabilities() {
    setSavingProbs(true)
    const payload: Record<string, number> = {}
    for (const [stage, value] of Object.entries(probabilities)) {
      const n = parseInt(value, 10)
      payload[stage] = isNaN(n) ? 0 : Math.min(100, Math.max(0, n))
    }
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_stage_probabilities: payload }),
    })
    if (res.ok) { setSavedProbs(true); setTimeout(() => setSavedProbs(false), 2000) }
    setSavingProbs(false)
  }

  async function handleReset() {
    setResetting(true)
    const res = await fetch('/api/admin/reset-db', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'RESET' }),
    })
    if (res.ok) {
      setResetDone(true)
      setConfirmReset(false)
      setTimeout(() => { setResetDone(false); router.refresh() }, 2000)
    }
    setResetting(false)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/admin/import-csv', { method: 'POST', body: form })
    const data = await res.json()
    if (res.ok) {
      setImportResult({ ok: true, message: `${data.imported} lead importati con successo.` })
    } else {
      setImportResult({ ok: false, message: data.error ?? 'Errore durante l\'import.' })
    }
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Probabilità di chiusura per stadio</CardTitle>
          <CardDescription>Usata per il forecast pesato in dashboard. Stadi senza probabilità configurata contano 0%.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.pipeline_stages.map(stage => (
            <div key={stage} className="flex items-center gap-2">
              <Label htmlFor={`prob-${stage}`} className="flex-1">{stage}</Label>
              <Input
                id={`prob-${stage}`}
                type="number"
                min={0}
                max={100}
                value={probabilities[stage] ?? '0'}
                onChange={e => setProbabilities(p => ({ ...p, [stage]: e.target.value }))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          ))}
          <Button onClick={handleSaveProbabilities} disabled={savingProbs} size="sm">
            {savedProbs ? 'Salvato!' : savingProbs ? 'Salvataggio...' : 'Salva'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gestione Database</CardTitle>
          <CardDescription>Svuota o reimporta i dati dal tuo foglio CSV.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Svuota DB */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Svuota Database</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Elimina tutti i lead e le interazioni. Operazione irreversibile.
              </p>
            </div>
            {!confirmReset ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmReset(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Svuota Database
              </Button>
            ) : (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive font-medium">
                    Sei sicuro? Tutti i lead e le interazioni verranno eliminati definitivamente.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={handleReset} disabled={resetting}>
                    {resetting ? 'Eliminazione...' : 'Sì, svuota tutto'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                    Annulla
                  </Button>
                </div>
              </div>
            )}
            {resetDone && <p className="text-sm text-green-600">Database svuotato.</p>}
          </div>

          <div className="border-t pt-4 space-y-3">
            <div>
              <p className="text-sm font-medium">Importa da CSV</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Carica un file CSV con i campi standard (Nome, Email, Azienda, ecc.). I lead esistenti vengono aggiornati per email.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={importing}
              >
                <Upload className="h-4 w-4 mr-2" />
                {importing ? 'Importazione...' : 'Seleziona CSV'}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImport}
              />
            </div>
            {importResult && (
              <p className={`text-sm ${importResult.ok ? 'text-green-600' : 'text-destructive'}`}>
                {importResult.message}
              </p>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
