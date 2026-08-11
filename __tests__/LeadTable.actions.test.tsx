import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { LeadTable } from '@/components/leads/LeadTable'
import type { LeadWithComputed } from '@/types'

const { push, refresh } = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh, back: vi.fn() }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockLead: LeadWithComputed = {
  id: 'lead-1', created_at: '2026-01-01T00:00:00Z',
  nome: 'Marco', cognome: 'Rossi', azienda: 'Acme', email: 'marco@acme.it',
  tel: null, ruolo: null, tipo: null, richiesta: null, origine: 'Web',
  industry: null, dipendenti: null, hanno_sito: null, company_web: null,
  esperienza_us: null, stadio_pipeline: 'Lead In', stato_lead: null,
  stato: null, motivo_lost: null, valore: 1000, owner: null,
  data_apertura: null, appuntamento: null, stato_appuntamento: 'Non schedulato', ricontattare: null,
  data_ultimo_contatto: null, data_chiusura: null, data_chiusura_prevista: null, contattato: false,
  numero_messaggi: 0, risposto_ultima_mail: false, touchpoints: 0,
  note: null,
  giorni_ultimo_contatto: null, giorni_aperto: null, giorni_pipeline: null,
}

function renderTable() {
  return render(
    <LeadTable leads={[mockLead]} threshold={7} total={1} page={1} pageSize={50} />
  )
}

beforeEach(() => {
  push.mockClear()
  refresh.mockClear()
  window.ResizeObserver = vi.fn(() => ({
    observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
  })) as unknown as typeof ResizeObserver
})

describe('LeadTable actions', () => {
  test('renders edit and delete buttons per row', () => {
    renderTable()
    expect(screen.getByLabelText('Modifica lead')).toBeInTheDocument()
    expect(screen.getByLabelText('Elimina lead')).toBeInTheDocument()
  })

  test('clicking edit does not navigate to detail (stopPropagation)', () => {
    renderTable()
    fireEvent.click(screen.getByLabelText('Modifica lead'))
    expect(push).not.toHaveBeenCalled()
  })

  test('clicking delete opens the confirm dialog', () => {
    renderTable()
    fireEvent.click(screen.getByLabelText('Elimina lead'))
    expect(screen.getByText('Eliminare lead?')).toBeInTheDocument()
  })
})
