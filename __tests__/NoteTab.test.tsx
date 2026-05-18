import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import { NoteTab } from '@/app/leads/[id]/NoteTab'

describe('NoteTab', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('renders textarea with initial note value', () => {
    render(<NoteTab leadId="lead-1" initialNote="Nota di test" />)
    expect(screen.getByRole('textbox')).toHaveValue('Nota di test')
  })

  test('renders empty textarea when initialNote is null', () => {
    render(<NoteTab leadId="lead-1" initialNote={null} />)
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  test('PATCHes on blur with updated value', async () => {
    render(<NoteTab leadId="lead-1" initialNote="vecchia nota" />)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'nuova nota' } })
    fireEvent.blur(textarea)
    expect(mockFetch).toHaveBeenCalledWith('/api/leads/lead-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: 'nuova nota' }),
    })
  })

  test('shows "Salvato ✓" after successful save', async () => {
    render(<NoteTab leadId="lead-1" initialNote="nota" />)
    fireEvent.blur(screen.getByRole('textbox'))
    await screen.findByText('Salvato ✓')
  })

  test('shows "Errore" when PATCH fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })
    render(<NoteTab leadId="lead-1" initialNote="nota" />)
    fireEvent.blur(screen.getByRole('textbox'))
    await screen.findByText('Errore')
  })
})
