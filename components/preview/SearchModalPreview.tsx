'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PLUM, ORANGE, GRAY_BORDER, GRAY_500, WHITE } from '@/components/dashboard-preview/tokens'
import { stageBadgeColors } from './badge-colors'

type Result = {
  id: string
  nome: string | null
  cognome: string | null
  azienda: string | null
  email: string
  stadio_pipeline: string
  origine: string | null
}

export function SearchModalPreview() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults([])
      setSelected(0)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setResults(data)
    setSelected(0)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  function navigate(id: string) {
    setOpen(false)
    router.push(`/leads-preview/${id}`)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[selected]) navigate(results[selected].id)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          height: 34, width: '100%', border: '1px solid rgba(255,255,255,.28)', background: 'transparent',
          color: 'rgba(255,255,255,.7)', font: "600 10px/1 'Open Sans'", letterSpacing: '.1em', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px',
        }}
      >
        <span>CERCA</span><span>⌘K</span>
      </button>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12%' }}>
      <div onClick={() => setOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(55,46,53,.55)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 560, margin: '0 16px', background: WHITE, borderTop: `3px solid ${ORANGE}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: `1px solid ${GRAY_BORDER}` }}>
          <span style={{ font: "700 10px/1 'Open Sans'", letterSpacing: '.12em', color: ORANGE }}>CERCA</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Nome, azienda o email"
            style={{ flex: 1, border: 'none', outline: 'none', font: "400 15px/1 'Open Sans'", color: PLUM }}
          />
          {loading && <span style={{ font: "400 11px/1 'Open Sans'", color: GRAY_500 }}>...</span>}
          <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', font: "400 16px/1 'Open Sans'", color: GRAY_500 }}>
            ×
          </button>
        </div>

        {results.length > 0 && (
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {results.map((r, i) => (
              <button
                key={r.id}
                onClick={() => navigate(r.id)}
                onMouseEnter={() => setSelected(i)}
                style={{
                  display: 'flex', width: '100%', alignItems: 'center', gap: 14, padding: '14px 20px',
                  textAlign: 'left', border: 'none', borderBottom: '1px solid #EEEEEE', cursor: 'pointer',
                  background: i === selected ? '#faf9f7' : WHITE,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, font: "600 14px/1.3 'Open Sans'" }}>
                    {r.nome} {r.cognome}{' '}
                    <span style={{ font: "400 13px/1.3 'Open Sans'", color: GRAY_500 }}>· {r.azienda}</span>
                  </p>
                  <p style={{ margin: '3px 0 0', font: "400 12px/1.3 'Open Sans'", color: GRAY_500 }}>{r.email}</p>
                </div>
                <span style={{
                  display: 'inline-block', padding: '3px 8px', font: "700 9px/1.3 'Open Sans'", letterSpacing: '.1em',
                  background: stageBadgeColors(r.stadio_pipeline).bg, color: stageBadgeColors(r.stadio_pipeline).fg,
                }}>
                  {r.stadio_pipeline.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        )}

        {query.length >= 2 && !loading && results.length === 0 && (
          <p style={{ margin: 0, padding: '26px 20px', font: "400 13px/1 'Open Sans'", color: GRAY_500, textAlign: 'center' }}>
            Nessun risultato per &quot;{query}&quot;
          </p>
        )}

        {query.length < 2 && (
          <p style={{ margin: 0, padding: '26px 20px', font: "400 13px/1 'Open Sans'", color: GRAY_500, textAlign: 'center' }}>
            Digita almeno 2 caratteri
          </p>
        )}
      </div>
    </div>
  )
}
