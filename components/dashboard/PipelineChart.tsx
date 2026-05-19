'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const STAGE_COLORS: Record<string, string> = {
  'Lead In':        '#6366f1',
  'Discovery':      '#8b5cf6',
  'Proposal Sent':  '#f59e0b',
  'Chiuso (Vinto)': '#10b981',
  'Chiuso (Perso)': '#ef4444',
  'Cliente':        '#059669',
  'Studente':       '#9ca3af',
}

type Props = {
  data: { stage: string; count: number; revenue: number }[]
  onSegmentClick?: (stage: string) => void
}

export function PipelineChart({ data, onSegmentClick }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 32, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={110} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(value, _, props) => {
            const rev = props.payload?.revenue
            return [
              `${value} lead${rev > 0 ? ` · €${rev.toLocaleString('it-IT')}` : ''}`,
              'Stadio',
            ]
          }}
        />
        <Bar
          dataKey="count"
          radius={[0, 4, 4, 0]}
          cursor={onSegmentClick ? 'pointer' : undefined}
          onClick={onSegmentClick ? (entry: any) => onSegmentClick(entry.stage) : undefined}
        >
          {data.map(entry => (
            <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] ?? '#6366f1'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
