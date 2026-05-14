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
    fetch('/api/settings')
      .then(r => r.json())
      .then((s: Settings) => {
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
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
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
