type Props = {
  height: number
  className?: string
}

// public/urbistat/urbistat-logo.png è il lockup icona + "UrbiStat" (tagline
// "a DGS company" ritagliata via crop, non serve nella chrome del CRM).
// invert+brightness+saturate(0) converte il navy pieno in bianco per l'uso
// su sfondo scuro (sidebar/header/drawer/login), stesso trucco del mockup originale.
export function Logo({ height, className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/urbistat/urbistat-logo.png"
      alt="UrbiStat"
      className={className}
      style={{ height, maxWidth: '100%', display: 'block', filter: 'invert(1) brightness(2) saturate(0)' }}
    />
  )
}
