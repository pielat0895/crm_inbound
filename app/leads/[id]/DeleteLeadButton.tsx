'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function DeleteLeadButton({ leadId, leadName }: { leadId: string; leadName: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Errore durante l\'eliminazione')
      setLoading(false)
      return
    }
    toast.success('Lead eliminato')
    router.push('/leads')
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
        <span className="text-sm text-destructive font-medium">Eliminare {leadName}?</span>
        <Button size="sm" variant="destructive" onClick={handleDelete} disabled={loading}>
          {loading ? 'Eliminazione...' : 'Conferma'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirm(false)} disabled={loading}>
          Annulla
        </Button>
      </div>
    )
  }

  return (
    <Button size="sm" variant="destructive" onClick={() => setConfirm(true)}>
      <Trash2 className="h-4 w-4 mr-1.5" />
      Elimina lead
    </Button>
  )
}
