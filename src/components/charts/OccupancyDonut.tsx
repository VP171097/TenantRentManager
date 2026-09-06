import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useIsDarkMode } from '../../hooks/useTheme'
import { getChartPalette } from './chartTheme'

/** Current-snapshot donut of occupied vs vacant rooms. Occupancy history
 * isn't tracked in the schema (rooms.status is just current state), so
 * this is deliberately a snapshot rather than a fabricated trend. */
export function OccupancyDonut({ occupied, vacant }: { occupied: number; vacant: number }) {
  const isDark = useIsDarkMode()
  const palette = getChartPalette(isDark)
  const total = occupied + vacant

  if (total === 0) {
    return (
      <div className="card flex h-64 items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">
        No rooms yet — add a property and rooms to see occupancy.
      </div>
    )
  }

  const data = [
    { name: 'Occupied', value: occupied, color: palette.occupied },
    { name: 'Vacant', value: vacant, color: palette.vacant },
  ]

  return (
    <div className="card">
      <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Occupancy snapshot</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => `${value} room(s)`}
            contentStyle={{ background: palette.tooltipBg, border: `1px solid ${palette.tooltipBorder}`, borderRadius: 12, fontSize: 13 }}
            labelStyle={{ color: palette.tooltipText, fontWeight: 600 }}
            itemStyle={{ color: palette.tooltipText }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: palette.axis }} />
        </PieChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs text-slate-400 dark:text-slate-500">
        {occupied} occupied · {vacant} vacant · {Math.round((occupied / total) * 100)}% occupancy
      </p>
    </div>
  )
}
