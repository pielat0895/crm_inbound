'use client'
import { useState, useMemo } from 'react'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, flexRender,
  type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import type { LeadWithComputed } from '@/types'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OverdueBadge } from '@/components/ui/OverdueBadge'
import { ArrowUpDown, Download, Plus, X } from 'lucide-react'

const STAGE_COLORS: Record<string, string> = {
  'Lead In':        'bg-blue-100 text-blue-700',
  'Discovery':      'bg-violet-100 text-violet-700',
  'Proposal Sent':  'bg-amber-100 text-amber-700',
  'Chiuso (Vinto)': 'bg-green-100 text-green-700',
  'Chiuso (Perso)': 'bg-red-100 text-red-700',
  'Cliente':        'bg-emerald-100 text-emerald-700',
  'Studente':       'bg-gray-100 text-gray-600',
}

function StageBadge({ stage }: { stage: string }) {
  const cls = STAGE_COLORS[stage] ?? 'bg-gray-100 text-gray-600'
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{stage}</span>
}

type Props = {
  leads: LeadWithComputed[]
  threshold: number
  stages?: string[]
}

export function LeadTable({ leads, threshold, stages = [] }: Props) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [filterStadio, setFilterStadio] = useState('all')
  const [filterOrigine, setFilterOrigine] = useState('all')
  const [filterContattato, setFilterContattato] = useState('all')
  const [filterScaduto, setFilterScaduto] = useState(false)

  const origini = useMemo(() => {
    const set = new Set<string>()
    for (const l of leads) if (l.origine) set.add(l.origine)
    return Array.from(set).sort()
  }, [leads])

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (filterStadio !== 'all' && l.stadio_pipeline !== filterStadio) return false
      if (filterOrigine !== 'all' && l.origine !== filterOrigine) return false
      if (filterContattato === 'si' && !l.contattato) return false
      if (filterContattato === 'no' && l.contattato) return false
      if (filterScaduto && !(l.giorni_ultimo_contatto !== null && l.giorni_ultimo_contatto >= threshold)) return false
      return true
    })
  }, [leads, filterStadio, filterOrigine, filterContattato, filterScaduto, threshold])

  const hasActiveFilters = filterStadio !== 'all' || filterOrigine !== 'all' || filterContattato !== 'all' || filterScaduto

  function resetFilters() {
    setFilterStadio('all')
    setFilterOrigine('all')
    setFilterContattato('all')
    setFilterScaduto(false)
  }

  const columns: ColumnDef<LeadWithComputed>[] = useMemo(() => [
    {
      accessorKey: 'nome',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
          Nome <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => `${row.original.nome ?? ''} ${row.original.cognome ?? ''}`.trim() || '—',
    },
    { accessorKey: 'azienda', header: 'Azienda', cell: ({ getValue }) => (getValue() as string | null) ?? '—' },
    { accessorKey: 'origine', header: 'Origine', cell: ({ getValue }) => (getValue() as string | null) ?? '—' },
    { accessorKey: 'stadio_pipeline', header: 'Stadio', cell: ({ getValue }) => <StageBadge stage={getValue() as string} /> },
    {
      accessorKey: 'data_ultimo_contatto',
      header: 'Ultimo contatto',
      cell: ({ row }) => {
        const d = row.original.data_ultimo_contatto
        return d ? new Date(d).toLocaleDateString('it-IT') : '—'
      },
    },
    {
      id: 'followup',
      header: 'Follow-up',
      cell: ({ row }) => (
        <OverdueBadge giorni={row.original.giorni_ultimo_contatto} threshold={threshold} />
      ),
    },
    {
      accessorKey: 'valore',
      header: 'Valore',
      cell: ({ getValue }) => {
        const v = getValue() as number | null
        return v != null ? `€${v.toLocaleString('it-IT')}` : '—'
      },
    },
  ], [threshold])

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  function exportCSV() {
    const rows = table.getFilteredRowModel().rows
    const headers = ['Nome', 'Cognome', 'Azienda', 'Email', 'Tel', 'Origine', 'Stadio', 'Contattato', 'Valore', 'Data apertura', 'Data chiusura', 'Ultimo contatto']
    const lines = [
      headers.join(','),
      ...rows.map(r => {
        const l = r.original
        return [
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
        ].join(',')
      }),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'leads.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <Input
          placeholder="Cerca nome, azienda, email..."
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
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
        <Select value={filterStadio} onValueChange={v => setFilterStadio(v ?? 'all')}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue placeholder="Tutti gli stadi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stadi</SelectItem>
            {stages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterOrigine} onValueChange={v => setFilterOrigine(v ?? 'all')}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue placeholder="Tutte le origini" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le origini</SelectItem>
            {origini.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterContattato} onValueChange={v => setFilterContattato(v ?? 'all')}>
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
          variant={filterScaduto ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-sm"
          onClick={() => setFilterScaduto(v => !v)}
        >
          Follow-up scaduto
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-sm" onClick={resetFilters}>
            <X className="h-3 w-3 mr-1" /> Reset
          </Button>
        )}

        <span className="text-xs text-muted-foreground ml-auto">
          {table.getFilteredRowModel().rows.length} lead
        </span>
      </div>

      <div className="rounded-md border overflow-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b bg-muted/50">
                {hg.headers.map(h => (
                  <th key={h.id} className="px-4 py-2 text-left font-medium">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className="border-b cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => router.push(`/leads/${row.original.id}`)}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                  Nessun lead trovato
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
