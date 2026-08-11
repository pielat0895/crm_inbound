import { render, screen } from '@testing-library/react'
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
  data_apertura: null, appuntamento: null, stato_appuntamento: 'Non schedulato', ricontattare: null,
  data_ultimo_contatto: null, data_chiusura: null, data_chiusura_prevista: null, contattato: false,
  numero_messaggi: 0, risposto_ultima_mail: false, touchpoints: 0,
  note: 'Nota di test',
  giorni_ultimo_contatto: null, giorni_aperto: null, giorni_pipeline: null,
}

beforeEach(() => {
  window.ResizeObserver = vi.fn(() => ({
    observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
  })) as unknown as typeof ResizeObserver
})

describe('LeadForm hideNote', () => {
  test('shows Note field by default', () => {
    render(<LeadForm lead={mockLead} />)
    expect(screen.getByLabelText('Note')).toBeInTheDocument()
  })

  test('hides Note field when hideNote is true', () => {
    render(<LeadForm lead={mockLead} hideNote />)
    expect(screen.queryByLabelText('Note')).not.toBeInTheDocument()
  })
})
