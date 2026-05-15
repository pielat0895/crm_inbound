'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PRESETS = [
  { label: 'Tutto', value: 'all' },
  { label: '30 giorni', value: '30' },
  { label: '60 giorni', value: '60' },
  { label: '90 giorni', value: '90' },
  { label: 'Ultimo anno', value: '365' },
]

export function DateFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const current = params.get('range') ?? 'all'
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''

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
    </div>
  )
}
