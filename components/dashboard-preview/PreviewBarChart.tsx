'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { GRAY_500, GRAY_BORDER, ORANGE, SKY } from './tokens'

type Props = {
  data: { label: string; value: number }[]
  highlightLast?: boolean
  onSegmentClick?: (label: string) => void
}

export function PreviewBarChart({ data, highlightLast, onSegmentClick }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRAY_BORDER} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: GRAY_500 }} interval={0} />
        <YAxis tick={{ fontSize: 11, fill: GRAY_500 }} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 0, border: `1px solid ${GRAY_BORDER}` }} />
        <Bar
          dataKey="value"
          radius={0}
          cursor={onSegmentClick ? 'pointer' : undefined}
          onClick={onSegmentClick ? (entry: any) => onSegmentClick(entry.label) : undefined}
        >
          {data.map((entry, i) => (
            <Cell key={entry.label} fill={highlightLast && i === data.length - 1 ? ORANGE : SKY} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
