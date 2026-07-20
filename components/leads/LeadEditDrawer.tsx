'use client'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LeadForm } from './LeadForm'
import type { LeadWithComputed } from '@/types'

type Props = {
  lead: LeadWithComputed | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function LeadEditDrawer({ lead, open, onClose, onSaved }: Props) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/20 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPrimitive.Popup
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-xl flex-col bg-background shadow-xl outline-none',
            'data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right'
          )}
        >
          <div className="flex items-center justify-between border-b px-6 py-4">
            <DialogPrimitive.Title className="font-heading text-base font-medium">
              Modifica lead
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Chiudi"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {lead && (
              <LeadForm lead={lead} hideNote onSaved={onSaved} onCancel={onClose} />
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
