'use client'
import type { ReactNode } from 'react'

type Props = {
  title: string
  emoji: string
  count: number
  control?: ReactNode
  emptyText: string
  children: ReactNode
}

export function TaskSection({ title, emoji, count, control, emptyText, children }: Props) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="mr-2">{emoji}</span>
          {title}
          <span className="ml-2 text-xs font-normal">· {count}</span>
        </h2>
        {control}
      </div>
      {count === 0
        ? <p className="px-2 py-4 text-sm text-muted-foreground">{emptyText}</p>
        : children}
    </section>
  )
}
