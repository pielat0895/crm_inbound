'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Settings } from '@/types'
import { PLUM, ORANGE, GRAY_BORDER, GRAY_500, STAGE_COLORS } from '@/components/dashboard-preview/tokens'

type Props = {
  initialSettings: Settings
}

const cardStyle: React.CSSProperties = { background: '#fff', border: `1px solid ${GRAY_BORDER}`, padding: '24px 26px' }
const eyebrowStyle: React.CSSProperties = { margin: '0 0 6px', font: "700 11px/1 'Open Sans'", letterSpacing: '.12em', color: ORANGE }
const headingStyle: React.CSSProperties = { margin: '0 0 18px', fontFamily: "'Brygada 1918', Georgia, serif", fontWeight: 700, fontSize: 20, lineHeight: 1.15, textTransform: 'uppercase' }
const saveButtonStyle: React.CSSProperties = { height: 34, padding: '0 16px', border: 'none', background: ORANGE, color: '#fff', font: "700 11px/1 'Open Sans'", letterSpacing: '.12em', cursor: 'pointer' }

export function SettingsFormPreview({ initialSettings }: Props) {
  const router = useRouter()
  const [threshold, setThreshold] = useState(String(initialSettings.followup_threshold_days))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const initialProbs: Record<string, string> = {}
  for (const stage of initialSettings.pipeline_stages) {
    initialProbs[stage] = String(initialSettings.pipeline_stage_probabilities[stage] ?? 0)
  }
  const [probabilities, setProbabilities] = useState<Record<string, string>>(initialProbs)
  const [savingProbs, setSavingProbs] = useState(false)
  const [savedProbs, setSavedProbs] = useState(false)

  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ ok: boolean; message: string } | null>(null)

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
    setImportResult(res.ok
      ? { ok: true, message: `${data.imported} lead importati con successo.` }
      : { ok: false, message: data.error ?? "Errore durante l'import." })
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 24, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={cardStyle}>
          <p style={eyebrowStyle}>FOLLOW-UP</p>
          <h2 style={headingStyle}>SOGLIA DI SILENZIO</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number"
              min={1}
              value={threshold}
              onChange={e => setThreshold(e.target.value)}
              style={{ width: 80, height: 38, border: `1px solid ${GRAY_BORDER}`, background: '#fff', padding: '0 12px', font: "700 15px/1 'Open Sans'" }}
            />
            <span style={{ font: "400 13px/1 'Open Sans'", color: GRAY_500 }}>giorni</span>
          </div>
          <p style={{ margin: '12px 0 20px', font: "400 12px/1.6 'Open Sans'", color: GRAY_500 }}>
            Oltre questa soglia un lead entra tra i dormienti e viene marcato in arancione nelle liste.
          </p>
          <button onClick={handleSave} disabled={saving} style={saveButtonStyle}>
            {saved ? 'SALVATO ✓' : saving ? 'SALVATAGGIO…' : 'SALVA'}
          </button>
        </div>

        <div style={cardStyle}>
          <p style={eyebrowStyle}>DATI</p>
          <h2 style={headingStyle}>IMPORT E RESET</h2>
          <p style={{ margin: '0 0 14px', font: "400 12px/1.6 'Open Sans'", color: GRAY_500 }}>
            Import CSV con deduplicazione per email. Il reset svuota lead e interazioni: operazione irreversibile.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              style={{ height: 34, padding: '0 16px', border: `1px solid ${PLUM}`, background: '#fff', font: "600 11px/1 'Open Sans'", letterSpacing: '.08em', cursor: importing ? 'default' : 'pointer' }}
            >
              {importing ? 'IMPORTAZIONE…' : 'SELEZIONA CSV'}
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />

            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                style={{ height: 34, padding: '0 16px', border: `1px solid ${ORANGE}`, background: '#fff', color: ORANGE, font: "600 11px/1 'Open Sans'", letterSpacing: '.08em', cursor: 'pointer' }}
              >
                SVUOTA DATABASE
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ font: "600 11px/1.3 'Open Sans'", color: ORANGE }}>Sei sicuro? Azione irreversibile.</span>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  style={{ height: 32, padding: '0 12px', border: 'none', background: ORANGE, color: '#fff', font: "600 11px/1 'Open Sans'", cursor: 'pointer' }}
                >
                  {resetting ? 'ELIMINAZIONE…' : 'SÌ, SVUOTA'}
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  style={{ height: 32, padding: '0 12px', border: 'none', background: 'transparent', color: GRAY_500, font: "600 11px/1 'Open Sans'", cursor: 'pointer' }}
                >
                  ANNULLA
                </button>
              </div>
            )}
          </div>
          {resetDone && <p style={{ margin: '10px 0 0', font: "400 12px/1.4 'Open Sans'", color: '#2f9e6a' }}>Database svuotato.</p>}
          {importResult && (
            <p style={{ margin: '10px 0 0', font: "400 12px/1.4 'Open Sans'", color: importResult.ok ? '#2f9e6a' : ORANGE }}>
              {importResult.message}
            </p>
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <p style={eyebrowStyle}>FORECAST</p>
        <h2 style={{ ...headingStyle, marginBottom: 6 }}>PROBABILITÀ PER STADIO</h2>
        <p style={{ margin: '0 0 20px', font: "400 12px/1.6 'Open Sans'", color: GRAY_500 }}>
          Usata per il forecast pesato in dashboard. Gli stadi senza probabilità contano 0%.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {initialSettings.pipeline_stages.map(stage => (
            <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: `1px solid ${GRAY_BORDER}` }}>
              <span style={{ width: 12, height: 12, flex: 'none', transform: 'rotate(45deg)', background: STAGE_COLORS[stage] ?? PLUM }} />
              <span style={{ flex: 1, font: "600 12px/1 'Open Sans'", letterSpacing: '.08em' }}>{stage}</span>
              <div style={{ width: 140, height: 8, background: '#EEEEEE' }}>
                <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, parseInt(probabilities[stage] ?? '0', 10) || 0))}%`, background: STAGE_COLORS[stage] ?? PLUM }} />
              </div>
              <input
                value={probabilities[stage] ?? '0'}
                onChange={e => setProbabilities(p => ({ ...p, [stage]: e.target.value }))}
                style={{ width: 64, height: 34, border: `1px solid ${GRAY_BORDER}`, background: '#fff', padding: '0 10px', font: "700 13px/1 'Open Sans'", textAlign: 'right' }}
              />
              <span style={{ font: "400 12px/1 'Open Sans'", color: GRAY_500 }}>%</span>
            </div>
          ))}
        </div>
        <button onClick={handleSaveProbabilities} disabled={savingProbs} style={{ ...saveButtonStyle, marginTop: 20 }}>
          {savedProbs ? 'SALVATO ✓' : savingProbs ? 'SALVATAGGIO…' : 'SALVA'}
        </button>
      </div>
    </div>
  )
}
