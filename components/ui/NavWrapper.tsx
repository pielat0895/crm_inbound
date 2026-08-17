import { Toaster } from '@/components/ui/sonner'

// Ogni pagina renderizza la propria chrome (components/preview/PreviewShell,
// o niente per /login) — questo wrapper serve solo per il Toaster globale.
export function NavWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" richColors />
    </>
  )
}
