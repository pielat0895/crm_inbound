'use client'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

type Props = {
  label: string
  column: string
  currentSort: string
  currentDir: string
}

export function SortableHeader({ label, column, currentSort, currentDir }: Props) {
  const router = useRouter()

  function toggle() {
    const url = new URL(window.location.href)
    if (currentSort === column) {
      url.searchParams.set('sortDir', currentDir === 'asc' ? 'desc' : 'asc')
    } else {
      url.searchParams.set('sortBy', column)
      url.searchParams.set('sortDir', 'asc')
    }
    url.searchParams.set('page', '1')
    router.push(url.pathname + '?' + url.searchParams.toString())
  }

  const active = currentSort === column
  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 font-medium hover:text-foreground transition-colors"
    >
      {label}
      {active
        ? currentDir === 'asc'
          ? <ChevronUp className="h-3 w-3" />
          : <ChevronDown className="h-3 w-3" />
        : <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
      }
    </button>
  )
}
