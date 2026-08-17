'use client'
import { useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { NewTaskDialogPreview } from './NewTaskDialogPreview'
import { addDays } from '@/lib/tasks'
import type { FeedItem, TaskFeed, TaskFeedFilters, ClosingItem } from '@/lib/tasks'
import { PLUM, ORANGE, GRAY_150, GRAY_BORDER, GRAY_500, STAGE_COLORS } from '@/components/dashboard-preview/tokens'

type StageBar = { stage: string; count: number }

type Props = {
  feed: TaskFeed
  today: string
  owners: string[]
  filters: TaskFeedFilters
  stageBars: StageBar[]
}

/** "scaduto 2g" / "oggi" / "gio 30 lug" */
function formatDate(date: string | null, today: string): string {
  if (!date) return 'senza data'
  if (date === today) return 'OGGI'
  if (date < today) {
    const diff = Math.round((new Date(today).getTime() - new Date(date).getTime()) / 86400000)
    return `SCADUTO ${diff}G`
  }
  return new Date(date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()
}

function TaskRowPreview({
  item, today, onDone, onSnooze, onDelete,
}: {
  item: FeedItem
  today: string
  onDone: (item: FeedItem) => void
  onSnooze: (item: FeedItem, days: number) => void
  onDelete: (item: FeedItem) => void
}) {
  const overdue = item.date !== null && item.date < today
  const isDaFareOra = item.date !== null && item.date <= today

  return (
    <div
      className="group"
      style={{
        display: 'flex', alignItems: 'center', gap: 16, background: '#fff',
        borderBottom: `1px solid ${GRAY_BORDER}`,
        padding: `15px 18px 15px ${overdue && isDaFareOra ? '15px' : '18px'}`,
        borderLeft: overdue && isDaFareOra ? `3px solid ${ORANGE}` : '3px solid transparent',
      }}
    >
      <button
        onClick={() => onDone(item)}
        aria-label={`Completa: ${item.titolo}`}
        style={{ width: 15, height: 15, flex: 'none', border: `1.5px solid ${GRAY_500}`, background: '#fff', cursor: 'pointer', padding: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, font: `${isDaFareOra ? 600 : 400} 15px/1.35 'Open Sans'` }}>
          {item.titolo}
          {item.closingSoon && (
            <span style={{ marginLeft: 8, font: "700 9px/1.3 'Open Sans'", letterSpacing: '.08em', color: ORANGE }}>
              🎯 {item.valore ? `€${item.valore.toLocaleString('it-IT')}` : 'IN CHIUSURA'}
            </span>
          )}
        </p>
        <p style={{ margin: '3px 0 0', font: "400 12px/1.35 'Open Sans'", color: GRAY_500 }}>
          {item.leadId && item.kind === 'task' && item.leadLabel && (
            <Link href={`/leads/${item.leadId}`} style={{ color: GRAY_500 }}>{item.leadLabel}</Link>
          )}
          {item.kind === 'dormiente' && (
            item.maiContattato
              ? `mai contattato · in attesa da ${item.giorniSilenzio}g`
              : `${item.giorniSilenzio}g di silenzio`
          )}
        </p>
      </div>
      <span style={{ font: "700 13px/1 'Open Sans'" }}>{item.valore ? `€${item.valore.toLocaleString('it-IT')}` : ''}</span>
      <span style={{ width: 118, textAlign: 'right', font: "700 11px/1 'Open Sans'", letterSpacing: '.08em', color: overdue ? ORANGE : PLUM }}>
        {formatDate(item.date, today)}
      </span>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 'none' }}>
        {[1, 3, 7].map(days => (
          <button
            key={days}
            onClick={() => onSnooze(item, days)}
            title={`Rimanda ${days}g`}
            style={{ border: 'none', background: 'transparent', font: "600 10px/1 'Open Sans'", color: GRAY_500, cursor: 'pointer', padding: '2px 4px' }}
          >
            +{days}g
          </button>
        ))}
        {item.taskId && (
          <button
            onClick={() => onDelete(item)}
            aria-label={`Elimina: ${item.titolo}`}
            style={{ border: 'none', background: 'transparent', color: GRAY_500, cursor: 'pointer', padding: '2px 4px', font: "600 12px/1 'Open Sans'" }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

function ClosingCardPreview({ item }: { item: ClosingItem }) {
  const color = STAGE_COLORS[item.stadio] ?? PLUM
  return (
    <Link
      href={`/leads/${item.leadId}`}
      style={{ display: 'block', width: '100%', textAlign: 'left', background: '#fff', borderBottom: `1px solid ${GRAY_BORDER}`, padding: '14px 16px', textDecoration: 'none', color: 'inherit' }}
    >
      <p style={{ margin: 0, font: "700 22px/1 'Open Sans'", color }}>
        {item.valore ? `€${item.valore.toLocaleString('it-IT')}` : '—'}
      </p>
      <p style={{ margin: '6px 0 0', font: "600 12px/1.3 'Open Sans'" }}>{item.leadLabel}</p>
      <p style={{ margin: '2px 0 0', font: "400 11px/1.3 'Open Sans'", color: GRAY_500 }}>
        {item.stadio}
        {item.dataPrevista
          ? ` · chiusura ${new Date(item.dataPrevista).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`
          : ` · stimato · ultimo contatto ${item.giorniUltimoContatto ?? '—'}g fa`}
      </p>
    </Link>
  )
}

export function TaskFeedPreview({ feed, today, owners, filters, stageBars }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  function hide(key: string) { setHidden(prev => new Set(prev).add(key)) }
  function unhide(key: string) { setHidden(prev => { const next = new Set(prev); next.delete(key); return next }) }
  function refresh() {
    startTransition(() => {
      router.refresh()
      setHidden(new Set())
    })
  }

  async function patch(url: string, body: unknown, item: FeedItem, successMsg: string) {
    hide(item.key)
    const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
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
    await patch(`/api/leads/${item.leadId}`, { data_ultimo_contatto: today, ricontattare: null }, item, 'Follow-up registrato')
    fetch(`/api/leads/${item.leadId}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'nota', contenuto: 'Follow-up completato dalla pagina Da fare (preview)' }),
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

  function updateOwner(owner: string) {
    const next = new URLSearchParams(params.toString())
    if (owner) next.set('owner', owner)
    else next.delete('owner')
    router.push(`${pathname}?${next.toString()}`)
  }

  const visible = (items: FeedItem[]) => items.filter(i => !hidden.has(i.key))
  const daFareOra = visible(feed.daFareOra)
  const inArrivo = visible(feed.inArrivo)
  const dormienti = visible(feed.dormienti)
  const rowProps = { today, onDone: handleDone, onSnooze: handleSnooze, onDelete: handleDelete }

  const sections = [
    { title: 'DA FARE ORA', hint: 'scadenze di oggi e arretrati', rows: daFareOra, emptyText: 'Niente in scadenza oggi.' },
    { title: 'IN ARRIVO', hint: `prossimi ${filters.upcomingDays} giorni`, rows: inArrivo, emptyText: 'Nessuna scadenza nella finestra scelta.' },
    { title: 'DORMIENTI', hint: `oltre ${filters.dormantDays} giorni di silenzio`, rows: dormienti, emptyText: 'Nessun lead abbandonato.' },
  ]

  const maxStage = Math.max(1, ...stageBars.map(b => b.count))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]" style={{ gap: 34, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 34, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <select
            value={filters.owner ?? ''}
            onChange={e => updateOwner(e.target.value)}
            style={{ height: 32, border: `1px solid ${GRAY_BORDER}`, background: '#fff', padding: '0 10px', font: "400 13px/1 'Open Sans'" }}
          >
            <option value="">Tutti gli owner</option>
            {owners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <span style={{ font: "400 12px/1 'Open Sans'", color: GRAY_500 }}>
            finestre {filters.upcomingDays} · {filters.closingDays} · {filters.dormantDays} giorni
          </span>
          <NewTaskDialogPreview owners={owners} onCreated={refresh} />
        </div>

        {sections.map(s => (
          <section key={s.title}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, paddingBottom: 9, borderBottom: `2px solid ${PLUM}` }}>
              <h2 style={{ margin: 0, font: "700 13px/1 'Open Sans'", letterSpacing: '.12em' }}>{s.title}</h2>
              <span style={{ font: "700 13px/1 'Open Sans'", color: ORANGE }}>{s.rows.length}</span>
              <span style={{ marginLeft: 'auto', font: "400 11px/1 'Open Sans'", color: GRAY_500 }}>{s.hint}</span>
            </div>
            {s.rows.length === 0 ? (
              <p style={{ margin: 0, padding: '20px 0', font: "400 13px/1 'Open Sans'", color: GRAY_500 }}>{s.emptyText}</p>
            ) : (
              <div>
                {s.rows.map(item => <TaskRowPreview key={item.key} item={item} {...rowProps} />)}
              </div>
            )}
          </section>
        ))}
      </div>

      <aside style={{ background: GRAY_150, padding: '26px 24px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div>
          <p style={{ margin: '0 0 14px', font: "700 11px/1 'Open Sans'", letterSpacing: '.12em' }}>PROSSIMI A CHIUSURA</p>
          {feed.prossimiChiusura.length === 0 ? (
            <p style={{ margin: 0, font: "400 12px/1.4 'Open Sans'", color: GRAY_500 }}>Nessun deal vicino alla chiusura.</p>
          ) : (
            <div>
              {feed.prossimiChiusura.map(item => <ClosingCardPreview key={item.leadId} item={item} />)}
            </div>
          )}
        </div>
        <div>
          <p style={{ margin: '0 0 14px', font: "700 11px/1 'Open Sans'", letterSpacing: '.12em' }}>PIPELINE OGGI</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stageBars.map(b => (
              <div key={b.stage}>
                <div style={{ display: 'flex', justifyContent: 'space-between', font: "600 11px/1.4 'Open Sans'", letterSpacing: '.06em', marginBottom: 4 }}>
                  <span>{b.stage.toUpperCase()}</span><span>{b.count}</span>
                </div>
                <div style={{ height: 8, background: '#fff' }}>
                  <div style={{ height: '100%', width: `${Math.round(b.count / maxStage * 100)}%`, background: STAGE_COLORS[b.stage] ?? PLUM }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
