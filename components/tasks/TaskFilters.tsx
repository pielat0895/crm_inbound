'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

type Props = {
  owners: string[]
  defaults: { upcoming: number; closing: number; dormant: number }
}

export function TaskFilters({ owners, defaults }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const owner = params.get('owner') ?? ''

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
      <select
        value={owner}
        onChange={e => update({ owner: e.target.value || null })}
        className="h-7 text-xs rounded-md border border-input bg-background px-2 cursor-pointer"
      >
        <option value="">Tutti gli owner</option>
        {owners.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <span className="text-xs text-muted-foreground">
        finestre: {params.get('upcoming') ?? defaults.upcoming}g · {params.get('closing') ?? defaults.closing}g · {params.get('dormant') ?? defaults.dormant}g
      </span>
    </div>
  )
}

export function WindowSelect({ param, value, options }: { param: string; value: number; options: number[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  return (
    <select
      value={String(value)}
      onChange={e => {
        const next = new URLSearchParams(params.toString())
        next.set(param, e.target.value)
        router.push(`${pathname}?${next.toString()}`)
      }}
      className="h-7 text-xs rounded-md border border-input bg-background px-2 cursor-pointer"
    >
      {options.map(o => <option key={o} value={o}>{o} giorni</option>)}
    </select>
  )
}
