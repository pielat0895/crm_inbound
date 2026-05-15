'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

type Props = {
  data: { origine: string; tassoVinti: number; tassoNonVinti: number; tasso: number }[]
}

export function ConversionChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="origine" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={48} />
        <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(value, name) => [
            `${value}%`,
            name === 'tassoVinti' ? 'Convertiti' : 'Non convertiti',
          ]}
        />
        <Legend formatter={v => v === 'tassoVinti' ? 'Convertiti' : 'Non convertiti'} wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="tassoVinti" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="tassoVinti" />
        <Bar dataKey="tassoNonVinti" stackId="a" fill="#e5e7eb" radius={[4, 4, 0, 0]} name="tassoNonVinti" />
      </BarChart>
    </ResponsiveContainer>
  )
}
