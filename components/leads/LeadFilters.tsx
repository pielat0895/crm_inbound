'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, Plus, X } from 'lucide-react'
import type { LeadWithComputed } from '@/types'
import { ORIGINE_OPTIONS } from '@/types'

type Props = {
  stages: string[]
  leads: LeadWithComputed[]
}

export function LeadFilters({ stages, leads }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const q = params.get('q') ?? ''
  const stadio = params.get('stadio') ?? 'all'
  const origine = params.get('origine') ?? 'all'
  const contattato = params.get('contattato') ?? 'all'
  const scaduto = params.get('scaduto') === '1'

  const hasFilters = q || stadio !== 'all' || origine !== 'all' || contattato !== 'all' || scaduto

  const update = useCallback((updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString())
    next.delete('page')
    for (const [k, v] of Object.entries(updates)) {
      if (v && v !== 'all') next.set(k, v)
      else next.delete(k)
    }
    router.push(`${pathname}?${next.toString()}`)
  }, [params, pathname, router])

  function reset() {
    router.push(pathname)
  }

  function exportCSV() {
    const headers = ['Nome', 'Cognome', 'Azienda', 'Email', 'Tel', 'Origine', 'Stadio', 'Contattato', 'Valore', 'Data apertura', 'Data chiusura', 'Ultimo contatto']
    const lines = [
      headers.join(','),
      ...leads.map(l => [
        `"${l.nome ?? ''}"`,
        `"${l.cognome ?? ''}"`,
        `"${l.azienda ?? ''}"`,
        `"${l.email}"`,
        `"${l.tel ?? ''}"`,
        `"${l.origine ?? ''}"`,
        `"${l.stadio_pipeline}"`,
        l.contattato ? 'Sì' : 'No',
        l.valore ?? '',
        l.data_apertura ?? '',
        l.data_chiusura ?? '',
        l.data_ultimo_contatto ?? '',
      ].join(',')),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'leads.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-center flex-wrap">
        <Input
          placeholder="Cerca nome, azienda, email..."
          defaultValue={q}
          onChange={e => update({ q: e.target.value || null })}
          className="max-w-sm"
        />
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" /> CSV
        </Button>
        <Button size="sm" onClick={() => router.push('/leads/new')}>
          <Plus className="h-4 w-4 mr-1" /> Nuovo lead
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <Select value={stadio} onValueChange={v => update({ stadio: v })}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue placeholder="Tutti gli stadi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stadi</SelectItem>
            {stages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={origine} onValueChange={v => update({ origine: v })}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue placeholder="Tutte le origini" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le origini</SelectItem>
            {ORIGINE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={contattato} onValueChange={v => update({ contattato: v })}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="Contattato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="si">Contattati</SelectItem>
            <SelectItem value="no">Non contattati</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={scaduto ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-sm"
          onClick={() => update({ scaduto: scaduto ? null : '1' })}
        >
          Follow-up scaduto
        </Button>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-sm" onClick={reset}>
            <X className="h-3 w-3 mr-1" /> Reset
          </Button>
        )}
      </div>
    </div>
  )
}
