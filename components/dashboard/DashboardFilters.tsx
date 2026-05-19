'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PRESETS = [
  { label: 'Tutto', value: 'all' },
  { label: '30g', value: '30' },
  { label: '60g', value: '60' },
  { label: '90g', value: '90' },
  { label: '1 anno', value: '365' },
]

type Props = {
  owners: string[]
  stages: string[]
  origini: string[]
}

export function DashboardFilters({ owners, stages, origini }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const current = params.get('range') ?? '30'
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const owner = params.get('owner') ?? ''
  const stadio = params.get('stadio') ?? ''
  const origine = params.get('origine') ?? ''

  const update = useCallback((updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    router.push(`${pathname}?${next.toString()}`)
  }, [params, pathname, router])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">Periodo:</span>
      {PRESETS.map(p => (
        <Button
          key={p.value}
          size="sm"
          variant={current === p.value && !from ? 'default' : 'outline'}
          className="h-7 text-xs px-3"
          onClick={() => update({ range: p.value, from: null, to: null })}
        >
          {p.label}
        </Button>
      ))}
      <div className="flex items-center gap-1 ml-1">
        <Input
          type="date"
          value={from}
          onChange={e => update({ from: e.target.value, range: null })}
          className="h-7 text-xs w-36"
        />
        <span className="text-xs text-muted-foreground">→</span>
        <Input
          type="date"
          value={to}
          onChange={e => update({ to: e.target.value, range: null })}
          className="h-7 text-xs w-36"
        />
      </div>

      <div className="flex items-center gap-2 ml-2 border-l pl-3">
        <select
          value={owner}
          onChange={e => update({ owner: e.target.value || null })}
          className="h-7 text-xs rounded-md border border-input bg-background px-2 cursor-pointer"
        >
          <option value="">Tutti gli owner</option>
          {owners.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        <select
          value={stadio}
          onChange={e => update({ stadio: e.target.value || null })}
          className="h-7 text-xs rounded-md border border-input bg-background px-2 cursor-pointer"
        >
          <option value="">Tutti gli stadi</option>
          {stages.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={origine}
          onChange={e => update({ origine: e.target.value || null })}
          className="h-7 text-xs rounded-md border border-input bg-background px-2 cursor-pointer"
        >
          <option value="">Tutte le origini</option>
          {origini.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    </div>
  )
}
