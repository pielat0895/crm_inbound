import { GRAY_150 } from './tokens'

type Props = {
  data: { label: string; value: string; color?: string }[]
  onSegmentClick?: (label: string) => void
}

export function PreviewStatList({ data, onSegmentClick }: Props) {
  return (
    <div>
      {data.map(d => (
        <div
          key={d.label}
          onClick={onSegmentClick ? () => onSegmentClick(d.label) : undefined}
          style={{
            display: 'flex', justifyContent: 'space-between', fontSize: 13,
            padding: '6px 0', borderBottom: `1px solid ${GRAY_150}`,
            cursor: onSegmentClick ? 'pointer' : undefined,
          }}
        >
          <span>{d.label}</span>
          <span style={{ fontWeight: 700, color: d.color }}>{d.value}</span>
        </div>
      ))}
    </div>
  )
}
