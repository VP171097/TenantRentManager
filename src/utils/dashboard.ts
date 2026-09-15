import { sumMoney } from './money'

export interface CollectionBill {
  total_due: number
  total_paid: number
  balance: number
}

/** A collection percentage must use the same cohort for numerator/denominator. */
export function collectionTotals(bills: CollectionBill[]) {
  const billed = sumMoney(...bills.map(b => Math.max(0, b.total_due)))
  const collected = sumMoney(...bills.map(b => Math.max(0, b.total_paid)))
  const applied = sumMoney(...bills.map(b => Math.min(Math.max(0, b.total_paid), Math.max(0, b.total_due))))
  return {
    billed, collected,
    outstanding: sumMoney(...bills.map(b => Math.max(0, b.balance))),
    credit: sumMoney(...bills.map(b => Math.max(0, -b.balance))),
    collectionPercent: billed > 0 ? Math.min(100, Math.round(applied / billed * 100)) : 0,
  }
}

/** Explicit Indian billing-period default; the selected period is always visible. */
export function currentBillingMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  return `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}`
}