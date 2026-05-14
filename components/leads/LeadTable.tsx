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
import { OverdueBadge } from '@/components/ui/OverdueBadge'
import { ArrowUpDown, Download, Plus } from 'lucide-react'

type Props = {
  leads: LeadWithComputed[]
  threshold: number
}

export function LeadTable({ leads, threshold }: Props) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

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
    { accessorKey: 'stadio_pipeline', header: 'Stadio' },
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
    data: leads,
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
    const headers = ['Nome', 'Azienda', 'Email', 'Origine', 'Stadio', 'Valore']
    const lines = [
      headers.join(','),
      ...rows.map(r => {
        const l = r.original
        return [
          `"${l.nome ?? ''} ${l.cognome ?? ''}"`,
          `"${l.azienda ?? ''}"`,
          `"${l.email}"`,
          `"${l.origine ?? ''}"`,
          `"${l.stadio_pipeline}"`,
          l.valore ?? '',
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
