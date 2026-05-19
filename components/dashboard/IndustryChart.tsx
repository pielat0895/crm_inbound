'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Props = {
  data: { name: string; value: number }[]
  onSegmentClick?: (name: string) => void
}

export function IndustryChart({ data, onSegmentClick }: Props) {
  const height = Math.max(200, data.length * 32)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={160} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar
          dataKey="value"
          name="Lead"
          fill="#6366f1"
          radius={[0, 4, 4, 0]}
          cursor={onSegmentClick ? 'pointer' : undefined}
          onClick={onSegmentClick ? (entry: any) => onSegmentClick(entry.name ?? '') : undefined}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
