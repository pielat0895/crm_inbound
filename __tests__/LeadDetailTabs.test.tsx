import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, test, expect } from 'vitest'
import { LeadDetailTabs } from '@/app/leads/[id]/LeadDetailTabs'
import type { LeadWithComputed, Interaction } from '@/types'

vi.mock('@/components/leads/LeadForm', () => ({
  LeadForm: () => <div data-testid="lead-form" />,
}))
vi.mock('@/app/leads/[id]/NoteTab', () => ({
  NoteTab: () => <div data-testid="note-tab" />,
}))
vi.mock('@/components/leads/InteractionTimeline', () => ({
  InteractionTimeline: () => <div data-testid="interaction-timeline" />,
}))

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

const mockInteractions: Interaction[] = []

describe('LeadDetailTabs', () => {
  test('renders 3 tabs', () => {
    render(<LeadDetailTabs lead={mockLead} interactions={mockInteractions} stages={[]} />)
    expect(screen.getByRole('tab', { name: 'Dettagli' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Note' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'HubSpot' })).toBeInTheDocument()
  })

  test('shows LeadForm by default (Dettagli tab)', () => {
    render(<LeadDetailTabs lead={mockLead} interactions={mockInteractions} stages={[]} />)
    expect(screen.getByTestId('lead-form')).toBeInTheDocument()
    expect(screen.queryByTestId('note-tab')).not.toBeInTheDocument()
  })

  test('InteractionTimeline always visible', () => {
    render(<LeadDetailTabs lead={mockLead} interactions={mockInteractions} stages={[]} />)
    expect(screen.getByTestId('interaction-timeline')).toBeInTheDocument()
  })

  test('clicking Note tab shows NoteTab', () => {
    render(<LeadDetailTabs lead={mockLead} interactions={mockInteractions} stages={[]} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Note' }))
    expect(screen.getByTestId('note-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('lead-form')).not.toBeInTheDocument()
  })

  test('clicking HubSpot tab shows placeholder text', () => {
    render(<LeadDetailTabs lead={mockLead} interactions={mockInteractions} stages={[]} />)
    fireEvent.click(screen.getByRole('tab', { name: 'HubSpot' }))
    expect(screen.getByText(/non ancora sincronizzato/i)).toBeInTheDocument()
  })

  test('clicking Dettagli tab after switching returns to LeadForm', () => {
    render(<LeadDetailTabs lead={mockLead} interactions={mockInteractions} stages={[]} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Note' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Dettagli' }))
    expect(screen.getByTestId('lead-form')).toBeInTheDocument()
  })
})
