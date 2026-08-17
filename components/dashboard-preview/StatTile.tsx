import { GRAY_500, HEADING_FONT, ORANGE, WHITE, PLUM } from './tokens'

type Props = {
  label: string
  value: string | number
  sub?: string
  dark?: boolean
  accent?: string
}

export function StatTile({ label, value, sub, dark, accent }: Props) {
  return (
    <div style={{ background: dark ? PLUM : WHITE, padding: '20px 22px' }}>
      <div style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: dark ? '#B9B0B6' : GRAY_500 }}>
        {label}
      </div>
      <div style={{ fontFamily: HEADING_FONT, fontWeight: 700, fontSize: 40, lineHeight: 1.1, color: accent ?? (dark ? ORANGE : undefined) }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11.5, color: dark ? '#B9B0B6' : GRAY_500 }}>{sub}</div>
      )}
    </div>
  )
}
