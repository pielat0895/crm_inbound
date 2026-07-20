import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { LeadForm } from '@/components/leads/LeadForm'
import type { LeadWithComputed } from '@/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockLead: LeadWithComputed = {
  id: 'lead-1', created_at: '2026-01-01T00:00:00Z',
  nome: 'Marco', cognome: 'Rossi', azienda: 'Acme', email: 'marco@acme.it',
  tel: null, ruolo: null, tipo: null, richiesta: null, origine: null,
  industry: null, dipendenti: null, hanno_sito: null, company_web: null,
  esperienza_us: null, stadio_pipeline: 'Lead In', stato_lead: null,
  stato: null, motivo_lost: null, valore: null, owner: null,
  data_apertura: null, appuntamento: null, ricontattare: null,
  data_ultimo_contatto: null, data_chiusura: null, contattato: false,
  numero_messaggi: 0, risposto_ultima_mail: false, touchpoints: 0,
  note: 'Nota di test',
  giorni_ultimo_contatto: null, giorni_aperto: null, giorni_pipeline: null,
}

beforeEach(() => {
  window.ResizeObserver = vi.fn(() => ({
    observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
  })) as unknown as typeof ResizeObserver
})

describe('LeadForm callbacks', () => {
  test('calls onCancel instead of router.back when provided', () => {
    const onCancel = vi.fn()
    render(<LeadForm lead={mockLead} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('calls onSaved after successful PATCH', async () => {
    const onSaved = vi.fn()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ id: 'lead-1' }),
    }) as unknown as typeof fetch
    render(<LeadForm lead={mockLead} onSaved={onSaved} />)
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
  })
})
