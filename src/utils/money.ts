// All money math is done in integer paise to avoid floating point drift,
// then converted back to rupees (2-decimal) for storage/display.

export function toPaise(rupees: number): number {
  return Math.round(rupees * 100)
}

export function toRupees(paise: number): number {
  return Math.round(paise) / 100
}

/** Round-safe addition of any number of rupee amounts. */
export function sumMoney(...amounts: number[]): number {
  const paise = amounts.reduce((acc, a) => acc + toPaise(a || 0), 0)
  return toRupees(paise)
}

/** Round-safe subtraction: a - b - c - ... */
export function subMoney(a: number, ...rest: number[]): number {
  const paise = rest.reduce((acc, r) => acc - toPaise(r || 0), toPaise(a || 0))
  return toRupees(paise)
}

export function formatINR(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  return `${sign}₹${abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
