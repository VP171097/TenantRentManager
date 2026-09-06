/** Recharts renders to inline SVG and doesn't pick up Tailwind's `dark:`
 * classes, so chart colors are resolved explicitly per theme here — pass
 * `isDark` (from `useTheme`'s resolved state) into every chart. Palette
 * matches the brand/status colors already defined in src/index.css. */
export interface ChartPalette {
  grid: string
  axis: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
  expected: string
  collected: string
  occupied: string
  vacant: string
}

export function getChartPalette(isDark: boolean): ChartPalette {
  return isDark
    ? {
        grid: '#334155', // slate-700
        axis: '#94a3b8', // slate-400
        tooltipBg: '#1e293b', // slate-800
        tooltipBorder: '#334155',
        tooltipText: '#f1f5f9',
        expected: '#818cf8', // brand-300ish
        collected: '#4ade80', // green-400
        occupied: '#4ade80',
        vacant: '#fb923c', // orange-400
      }
    : {
        grid: '#e2e8f0', // slate-200
        axis: '#64748b', // slate-500
        tooltipBg: '#ffffff',
        tooltipBorder: '#e2e8f0',
        tooltipText: '#0f172a',
        expected: '#4f46e5', // brand-500
        collected: '#16a34a', // green-600 (paid)
        occupied: '#16a34a',
        vacant: '#ea580c', // orange-600 (pending)
      }
}
