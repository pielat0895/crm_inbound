'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { GRAY_150, GRAY_500, GRAY_BORDER, TEAL } from './tokens'

type Props = {
  data: { label: string; tassoVinti: number; tassoNonVinti: number }[]
  onSegmentClick?: (label: string) => void
}

export function PreviewStackedBarChart({ data, onSegmentClick }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRAY_BORDER} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: GRAY_500 }} interval={0} angle={-20} textAnchor="end" height={48} />
        <YAxis tick={{ fontSize: 11, fill: GRAY_500 }} unit="%" domain={[0, 100]} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 0, border: `1px solid ${GRAY_BORDER}` }}
          formatter={(value, name) => [`${value}%`, name === 'tassoVinti' ? 'Convertiti' : 'Non convertiti']}
        />
        <Legend formatter={v => v === 'tassoVinti' ? 'Convertiti' : 'Non convertiti'} wrapperStyle={{ fontSize: 11 }} />
        <Bar
          dataKey="tassoVinti"
          stackId="a"
          fill={TEAL}
          radius={0}
          name="tassoVinti"
          cursor={onSegmentClick ? 'pointer' : undefined}
          onClick={onSegmentClick ? (entry: any) => onSegmentClick(entry.label) : undefined}
        />
        <Bar
          dataKey="tassoNonVinti"
          stackId="a"
          fill={GRAY_150}
          radius={0}
          name="tassoNonVinti"
          cursor={onSegmentClick ? 'pointer' : undefined}
          onClick={onSegmentClick ? (entry: any) => onSegmentClick(entry.label) : undefined}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
