'use client'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

type Props = {
  data: { label: string; count: number; cumulativo: number }[]
}

export function TrendChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(value, name) => [value, name === 'count' ? 'Lead' : 'Cumulativo']}
        />
        <Legend formatter={v => v === 'count' ? 'Lead / mese' : 'Cumulativo'} wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="count" />
        <Line dataKey="cumulativo" stroke="#f59e0b" strokeWidth={2} dot={false} name="cumulativo" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
