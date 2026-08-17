import { GRAY_100 } from './tokens'

type Props = {
  data: { label: string; count: number; color: string }[]
  onSegmentClick?: (label: string) => void
}

// "Imbuto pipeline": barre orizzontali sottili, larghezza proporzionale al
// massimo del gruppo — stesso pattern del mockup Urbistat.
export function PreviewFunnelBars({ data, onSegmentClick }: Props) {
  const max = Math.max(1, ...data.map(d => d.count))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      {data.map(d => (
        <div key={d.label} onClick={onSegmentClick ? () => onSegmentClick(d.label) : undefined} style={{ cursor: onSegmentClick ? 'pointer' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 5 }}>
            <span>{d.label}</span>
            <span style={{ fontWeight: 700 }}>{d.count}</span>
          </div>
          <div style={{ height: 20, background: GRAY_100 }}>
            <div style={{ height: 20, width: `${Math.round((d.count / max) * 100)}%`, background: d.color }} />
          </div>
        </div>
      ))}
    </div>
  )
}
