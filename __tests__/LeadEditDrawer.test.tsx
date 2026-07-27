import { render, screen } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { LeadEditDrawer } from '@/components/leads/LeadEditDrawer'
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
  data_ultimo_contatto: null, data_chiusura: null, data_chiusura_prevista: null, contattato: false,
  numero_messaggi: 0, risposto_ultima_mail: false, touchpoints: 0,
  note: null,
  giorni_ultimo_contatto: null, giorni_aperto: null, giorni_pipeline: null,
}

beforeEach(() => {
  window.ResizeObserver = vi.fn(() => ({
    observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
  })) as unknown as typeof ResizeObserver
})

describe('LeadEditDrawer', () => {
  test('renders the pre-filled form when open', () => {
    render(<LeadEditDrawer lead={mockLead} open onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByText('Modifica lead')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Marco')
  })

  test('renders nothing visible when closed', () => {
    render(<LeadEditDrawer lead={mockLead} open={false} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.queryByText('Modifica lead')).not.toBeInTheDocument()
  })
})
