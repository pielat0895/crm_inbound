'use client'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

type Props = {
  data: { label: string; count: number; media: number }[]
}

export function TrendChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          interval={data.length > 18 ? Math.floor(data.length / 12) : 0}
        />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(value, name) => [value, name === 'count' ? 'Lead nel mese' : 'Media 3 mesi']}
        />
        <Legend
          formatter={v => v === 'count' ? 'Lead / mese' : 'Media mobile 3 mesi'}
          wrapperStyle={{ fontSize: 11 }}
        />
        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="count" />
        <Line
          dataKey="media"
          stroke="#f59e0b"
          strokeWidth={2.5}
          dot={false}
          strokeDasharray="4 2"
          name="media"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
