import { GRAY_BORDER, HEADING_FONT, ORANGE, WHITE } from './tokens'

type Props = {
  title: React.ReactNode
  children: React.ReactNode
}

export function SectionCard({ title, children }: Props) {
  return (
    <div style={{ background: WHITE, border: `1px solid ${GRAY_BORDER}`, padding: '22px 24px 18px' }}>
      <h2 style={{ fontFamily: HEADING_FONT, fontWeight: 700, fontSize: 15, letterSpacing: '.07em', textTransform: 'uppercase', margin: '0 0 20px' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

export function Accent({ children }: { children: React.ReactNode }) {
  return <span style={{ color: ORANGE }}>{children}</span>
}
