'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { GRAY_500, GRAY_BORDER, ORANGE } from './tokens'

type Props = {
  data: { label: string; count: number }[]
  colors: Record<string, string>
  onSegmentClick?: (label: string) => void
}

export function PreviewHorizontalBarChart({ data, colors, onSegmentClick }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRAY_BORDER} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: GRAY_500 }} allowDecimals={false} />
        <YAxis dataKey="label" type="category" tick={{ fontSize: 11, fill: GRAY_500 }} width={110} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 0, border: `1px solid ${GRAY_BORDER}` }} formatter={value => [`${value} lead`, '']} />
        <Bar
          dataKey="count"
          radius={0}
          cursor={onSegmentClick ? 'pointer' : undefined}
          onClick={onSegmentClick ? (entry: any) => onSegmentClick(entry.label) : undefined}
        >
          {data.map(entry => (
            <Cell key={entry.label} fill={colors[entry.label] ?? ORANGE} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
