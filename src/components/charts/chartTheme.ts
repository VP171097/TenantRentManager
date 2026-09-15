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
        grid: '#44403c',
        axis: '#cec5b7',
        tooltipBg: '#171412',
        tooltipBorder: '#44403c',
        tooltipText: '#faf7f0',
        expected: '#fbbf24',
        collected: '#2dd4bf',
        occupied: '#2dd4bf',
        vacant: '#fbbf24',
      }
    : {
        grid: '#e7e0d4',
        axis: '#787166',
        tooltipBg: '#ffffff',
        tooltipBorder: '#e7e0d4',
        tooltipText: '#171412',
        expected: '#d97706',
        collected: '#0d9488',
        occupied: '#0d9488',
        vacant: '#d97706',
      }
}
