'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ORANGE, GRAY_500 } from '@/components/dashboard-preview/tokens'

// Duplicato di app/leads/[id]/DeleteLeadButton.tsx: stessa logica, redirect
// verso /leads-preview invece di /leads per restare nell'anteprima UrbiStat.
export function DeleteLeadButtonPreview({ leadId, leadName }: { leadId: string; leadName: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error("Errore durante l'eliminazione")
      setLoading(false)
      return
    }
    toast.success('Lead eliminato')
    router.push('/leads-preview')
  }

  if (confirm) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ font: "600 11px/1.3 'Open Sans'", color: ORANGE }}>Eliminare {leadName}?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          style={{ height: 32, padding: '0 12px', border: 'none', background: ORANGE, color: '#fff', font: "600 11px/1 'Open Sans'", cursor: 'pointer' }}
        >
          {loading ? 'Eliminazione...' : 'Conferma'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          disabled={loading}
          style={{ height: 32, padding: '0 12px', border: 'none', background: 'transparent', color: GRAY_500, font: "600 11px/1 'Open Sans'", cursor: 'pointer' }}
        >
          Annulla
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      style={{ height: 32, padding: '0 14px', border: `1px solid ${ORANGE}`, background: '#fff', color: ORANGE, font: "600 11px/1 'Open Sans'", letterSpacing: '.08em', cursor: 'pointer' }}
    >
      ELIMINA
    </button>
  )
}
