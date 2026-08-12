'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { STATO_TERMINALI_CHART_COLORS } from '@/lib/stage-colors'

type Props = {
  data: { stato: string; count: number }[]
  onSegmentClick?: (stato: string) => void
}

export function EsitiChart({ data, onSegmentClick }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 32, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis dataKey="stato" type="category" tick={{ fontSize: 11 }} width={110} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(value) => [`${value} lead`, 'Esito']}
        />
        <Bar
          dataKey="count"
          radius={[0, 4, 4, 0]}
          cursor={onSegmentClick ? 'pointer' : undefined}
          onClick={onSegmentClick ? (entry: any) => onSegmentClick(entry.stato) : undefined}
        >
          {data.map(entry => (
            <Cell key={entry.stato} fill={STATO_TERMINALI_CHART_COLORS[entry.stato] ?? '#6366f1'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
