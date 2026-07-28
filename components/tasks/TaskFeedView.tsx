'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { TaskSection } from './TaskSection'
import { TaskRow } from './TaskRow'
import { ClosingCard } from './ClosingCard'
import { NewTaskDialog } from './NewTaskDialog'
import { TaskFilters, WindowSelect } from './TaskFilters'
import { addDays } from '@/lib/tasks'
import type { FeedItem, TaskFeed, TaskFeedFilters } from '@/lib/tasks'

type Props = {
  feed: TaskFeed
  today: string
  owners: string[]
  filters: TaskFeedFilters
}

export function TaskFeedView({ feed, today, owners, filters }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  // Chiavi nascoste subito dopo una mutazione riuscita, in attesa del refresh.
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  function hide(key: string) {
    setHidden(prev => new Set(prev).add(key))
  }

  function unhide(key: string) {
    setHidden(prev => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  function refresh() {
    // Svuota `hidden` insieme al refresh: da qui in poi la verità è quella del
    // server. Senza questo, una key che torna nel feed (es. lead a cui rimetti
    // una data di ricontatto) resterebbe nascosta per tutta la sessione.
    startTransition(() => {
      router.refresh()
      setHidden(new Set())
    })
  }

  async function patch(url: string, body: unknown, item: FeedItem, successMsg: string) {
    hide(item.key)
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      unhide(item.key)
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Operazione fallita')
      return
    }
    toast.success(successMsg)
    refresh()
  }

  async function handleDone(item: FeedItem) {
    if (item.taskId) {
      await patch(`/api/tasks/${item.taskId}`, { done: true }, item, 'Task completato')
      return
    }
    if (!item.leadId) return
    // Item derivato: aggiorna il dato reale sul lead, così l'item sparisce da solo.
    await patch(
      `/api/leads/${item.leadId}`,
      { data_ultimo_contatto: today, ricontattare: null },
      item,
      'Follow-up registrato',
    )
    // Registro nella timeline del lead, che resta la fonte unica dello storico.
    fetch(`/api/leads/${item.leadId}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'nota', contenuto: 'Follow-up completato dalla pagina Da fare' }),
    }).catch(() => {})
  }

  async function handleSnooze(item: FeedItem, days: number) {
    const base = item.date && item.date > today ? item.date : today
    const next = addDays(base, days)
    if (item.taskId) {
      await patch(`/api/tasks/${item.taskId}`, { due_date: next }, item, `Rimandato al ${next}`)
      return
    }
    if (!item.leadId) return
    await patch(`/api/leads/${item.leadId}`, { ricontattare: next }, item, `Rimandato al ${next}`)
  }

  async function handleDelete(item: FeedItem) {
    if (!item.taskId) return
    hide(item.key)
    const res = await fetch(`/api/tasks/${item.taskId}`, { method: 'DELETE' })
    if (!res.ok) {
      unhide(item.key)
      toast.error('Eliminazione fallita')
      return
    }
    toast.success('Task eliminato')
    refresh()
  }

  const visible = (items: FeedItem[]) => items.filter(i => !hidden.has(i.key))

  const daFareOra = visible(feed.daFareOra)
  const inArrivo = visible(feed.inArrivo)
  const dormienti = visible(feed.dormienti)

  const rowProps = { today, onDone: handleDone, onSnooze: handleSnooze, onDelete: handleDelete }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TaskFilters
          owners={owners}
          defaults={{ upcoming: filters.upcomingDays, closing: filters.closingDays, dormant: filters.dormantDays }}
        />
        <NewTaskDialog owners={owners} onCreated={refresh} />
      </div>

      <TaskSection
        title="Da fare ora" emoji="⚠️" count={daFareOra.length}
        emptyText="Niente in scadenza oggi. Buon lavoro."
      >
        <div className="divide-y">
          {daFareOra.map(item => <TaskRow key={item.key} item={item} {...rowProps} />)}
        </div>
      </TaskSection>

      <TaskSection
        title="In arrivo" emoji="📅" count={inArrivo.length}
        control={<WindowSelect param="upcoming" value={filters.upcomingDays} options={[3, 7, 14, 30]} />}
        emptyText="Nessuna scadenza nella finestra scelta."
      >
        <div className="divide-y">
          {inArrivo.map(item => <TaskRow key={item.key} item={item} {...rowProps} />)}
        </div>
      </TaskSection>

      <TaskSection
        title="Prossimi a chiusura" emoji="🎯" count={feed.prossimiChiusura.length}
        control={<WindowSelect param="closing" value={filters.closingDays} options={[15, 30, 60, 90]} />}
        emptyText="Nessun deal vicino alla chiusura."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {feed.prossimiChiusura.map(item => <ClosingCard key={item.leadId} item={item} />)}
        </div>
      </TaskSection>

      <TaskSection
        title="Dormienti" emoji="💤" count={dormienti.length}
        control={<WindowSelect param="dormant" value={filters.dormantDays} options={[7, 14, 21, 30, 60]} />}
        emptyText="Nessun lead abbandonato. Ottimo."
      >
        <div className="divide-y">
          {dormienti.map(item => <TaskRow key={item.key} item={item} {...rowProps} />)}
        </div>
      </TaskSection>
    </div>
  )
}
