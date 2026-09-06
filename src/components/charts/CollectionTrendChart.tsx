import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthlyTrendPoint } from '../../services/dashboard'
import { useIsDarkMode } from '../../hooks/useTheme'
import { getChartPalette } from './chartTheme'
import { formatINR } from '../../utils/money'

/** Compact form for axis/tooltip labels ("₹1.2k") — full formatINR is too
 * wide for a bar chart's y-axis ticks. */
function formatCompactINR(n: number): string {
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}k`
  return `₹${Math.round(n)}`
}

export function CollectionTrendChart({ data }: { data: MonthlyTrendPoint[] }) {
  const isDark = useIsDarkMode()
  const palette = getChartPalette(isDark)

  const monthsWithData = data.filter((d) => d.expected > 0 || d.collected > 0).length
  if (monthsWithData < 2) {
    return (
      <div className="card flex h-64 items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">
        Not enough billing history yet — generate a few more months of bills to see the collection trend.
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Monthly collection vs expected</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: palette.axis, fontSize: 12 }} axisLine={{ stroke: palette.grid }} tickLine={false} />
          <YAxis tickFormatter={formatCompactINR} tick={{ fill: palette.axis, fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
          <Tooltip
            formatter={(value) => formatINR(Number(value))}
            contentStyle={{ background: palette.tooltipBg, border: `1px solid ${palette.tooltipBorder}`, borderRadius: 12, fontSize: 13 }}
            labelStyle={{ color: palette.tooltipText, fontWeight: 600 }}
            itemStyle={{ color: palette.tooltipText }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: palette.axis }} />
          <Bar dataKey="expected" name="Expected" fill={palette.expected} radius={[6, 6, 0, 0]} />
          <Bar dataKey="collected" name="Collected" fill={palette.collected} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
