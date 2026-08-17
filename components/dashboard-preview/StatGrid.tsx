import { GRAY_BORDER } from './tokens'

type Props = {
  columns: number
  children: React.ReactNode
}

// Griglia con gap di 1px sopra sfondo grigio: crea gli hairline tra le celle
// tipici del mockup Urbistat, senza bordi arrotondati.
export function StatGrid({ columns, children }: Props) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 1,
        background: GRAY_BORDER,
        border: `1px solid ${GRAY_BORDER}`,
        marginBottom: 24,
      }}
    >
      {children}
    </div>
  )
}
