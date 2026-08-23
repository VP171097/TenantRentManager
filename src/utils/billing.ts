import { sumMoney, subMoney } from './money'

/**
 * Core billing/financial-engine logic. Kept as pure, dependency-free
 * functions so they are trivially unit-testable and reusable both from
 * the client (preview calculations) and from any server-side function
 * that mirrors this logic.
 */

export interface ElectricityInput {
  previousReading: number
  currentReading: number
  ratePerUnit: number
  isMeterReset?: boolean
}

export class NegativeUnitsError extends Error {
  constructor() {
    super('Current reading is less than previous reading. Enable meter-reset with an explanation if the meter was replaced/reset.')
    this.name = 'NegativeUnitsError'
  }
}

/** units = current - previous. Throws unless isMeterReset is explicitly set. */
export function calcElectricityUnits(input: ElectricityInput): number {
  const { previousReading, currentReading, isMeterReset } = input
  const units = currentReading - previousReading
  if (units < 0 && !isMeterReset) {
    throw new NegativeUnitsError()
  }
  return units < 0 ? 0 : units
}

export function calcElectricityCharge(input: ElectricityInput): number {
  const units = calcElectricityUnits(input)
  return sumMoney(units * input.ratePerUnit)
}

export interface RentRevisionLike {
  effective_date: string
  rent_amount: number
}

/** Selects the rent that applies on `date` — the latest revision whose
 * effective_date is <= date. Revisions must be sorted ascending or not;
 * this function sorts internally. */
export function applicableRent(revisions: RentRevisionLike[], date: string): number {
  const applicable = revisions
    .filter((r) => r.effective_date <= date)
    .sort((a, b) => (a.effective_date < b.effective_date ? 1 : -1))
  if (applicable.length === 0) {
    throw new Error('No rent revision applicable for the given date')
  }
  return applicable[0].rent_amount
}

/** Computes a new rent amount from a percentage or fixed increase. */
export function computeRevisedRent(
  currentRent: number,
  changeType: 'fixed' | 'percentage',
  changeValue: number
): number {
  if (changeType === 'fixed') {
    return sumMoney(currentRent, changeValue)
  }
  const increase = sumMoney((currentRent * changeValue) / 100)
  return sumMoney(currentRent, increase)
}

export interface BillCalcInput {
  rentAmount: number
  electricityCharge: number
  otherCharges?: number
  lateFee?: number
  previousBalance?: number // positive outstanding carried from last bill
  previousCredit?: number // positive credit carried from last bill
}

export interface BillCalcResult {
  totalDue: number
}

/** total_due = rent + electricity + other + lateFee + previousBalance - previousCredit */
export function calcTotalDue(input: BillCalcInput): number {
  const { rentAmount, electricityCharge, otherCharges = 0, lateFee = 0, previousBalance = 0, previousCredit = 0 } = input
  return subMoney(sumMoney(rentAmount, electricityCharge, otherCharges, lateFee, previousBalance), previousCredit)
}

/** balance = total_due - total_paid. Positive = outstanding, negative = credit. */
export function calcBalance(totalDue: number, totalPaid: number): number {
  return subMoney(totalDue, totalPaid)
}

/** Splits a raw balance into (previousBalance, previousCredit) pair to carry
 * forward into next month's bill, per the "never manually copy" rule —
 * always derive this from the prior bill's balance. */
export function splitCarryForward(balance: number): { previousBalance: number; previousCredit: number } {
  if (balance > 0) return { previousBalance: balance, previousCredit: 0 }
  if (balance < 0) return { previousBalance: 0, previousCredit: Math.abs(balance) }
  return { previousBalance: 0, previousCredit: 0 }
}

export function sumPayments(amounts: number[]): number {
  return sumMoney(...amounts)
}

export type BillStatus = 'paid' | 'partial' | 'unpaid' | 'overdue'

export function calcBillStatus(totalDue: number, totalPaid: number, dueDatePassed: boolean): BillStatus {
  const balance = calcBalance(totalDue, totalPaid)
  if (balance <= 0) return 'paid'
  if (totalPaid > 0) return 'partial'
  return dueDatePassed ? 'overdue' : 'unpaid'
}

/** Formats a billing month Date/string as the first-of-month YYYY-MM-01 key
 * used for the unique (tenant_id, billing_month) constraint. */
export function billingMonthKey(year: number, month1to12: number): string {
  const mm = String(month1to12).padStart(2, '0')
  return `${year}-${mm}-01`
}

/** Generates a receipt number like KR-2025-01-00042.
 * Uniqueness must ultimately be enforced by a DB sequence/unique constraint
 * (see receipt_number generation function in migrations); this pure helper
 * formats a number that the DB assigns. */
export function formatReceiptNumber(propertyCode: string, year: number, month1to12: number, seq: number): string {
  const mm = String(month1to12).padStart(2, '0')
  const seqStr = String(seq).padStart(5, '0')
  return `${propertyCode.toUpperCase()}-${year}-${mm}-${seqStr}`
}
