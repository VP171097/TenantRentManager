export function meterPreview(previous: number, current: number | '', rate: number, reset = false, deferred = false) {
  if (current === '' || ![previous, current, rate].every(Number.isFinite) || previous < 0 || current < 0 || rate < 0) {
    return { valid: false, units: 0, amount: 0 }
  }
  if (!reset && current < previous) return { valid: false, units: 0, amount: 0 }
  const units = Math.round((reset ? current : current - previous) * 100) / 100
  return { valid: true, units, amount: deferred ? 0 : Math.round(units * rate * 100) / 100 }
}