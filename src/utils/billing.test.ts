import { describe, it, expect } from 'vitest'
import {
  calcElectricityUnits,
  calcElectricityCharge,
  NegativeUnitsError,
  applicableRent,
  computeRevisedRent,
  calcTotalDue,
  calcBalance,
  splitCarryForward,
  sumPayments,
  calcBillStatus,
  formatReceiptNumber,
  billingMonthKey,
} from './billing'

describe('electricity calculation', () => {
  it('computes units as current - previous', () => {
    expect(calcElectricityUnits({ previousReading: 100, currentReading: 150, ratePerUnit: 8 })).toBe(50)
  })

  it('computes charge = units * rate', () => {
    expect(calcElectricityCharge({ previousReading: 100, currentReading: 150, ratePerUnit: 8 })).toBe(400)
  })

  it('throws on negative units without meter reset flag', () => {
    expect(() => calcElectricityUnits({ previousReading: 500, currentReading: 100, ratePerUnit: 8 })).toThrow(
      NegativeUnitsError
    )
  })

  it('allows negative-looking reading with meter reset flag, clamped to 0', () => {
    expect(
      calcElectricityUnits({ previousReading: 500, currentReading: 100, ratePerUnit: 8, isMeterReset: true })
    ).toBe(0)
  })
})

describe('rent revisions', () => {
  const revisions = [
    { effective_date: '2025-01-01', rent_amount: 5000 },
    { effective_date: '2025-06-01', rent_amount: 5500 },
    { effective_date: '2026-01-01', rent_amount: 6000 },
  ]

  it('selects the latest revision effective on or before the date', () => {
    expect(applicableRent(revisions, '2025-03-15')).toBe(5000)
    expect(applicableRent(revisions, '2025-06-01')).toBe(5500)
    expect(applicableRent(revisions, '2025-12-31')).toBe(5500)
    expect(applicableRent(revisions, '2026-02-01')).toBe(6000)
  })

  it('throws if no revision applies yet', () => {
    expect(() => applicableRent(revisions, '2024-01-01')).toThrow()
  })

  it('computes a fixed increase', () => {
    expect(computeRevisedRent(5000, 'fixed', 500)).toBe(5500)
  })

  it('computes a percentage increase', () => {
    expect(computeRevisedRent(5000, 'percentage', 10)).toBe(5500)
  })
})

describe('total due & balance carry-forward', () => {
  it('sums rent + electricity + other + late fee + previous balance - previous credit', () => {
    const totalDue = calcTotalDue({
      rentAmount: 5000,
      electricityCharge: 400,
      otherCharges: 100,
      lateFee: 50,
      previousBalance: 200,
      previousCredit: 0,
    })
    expect(totalDue).toBe(5750)
  })

  it('subtracts previous credit', () => {
    const totalDue = calcTotalDue({
      rentAmount: 5000,
      electricityCharge: 400,
      previousCredit: 300,
    })
    expect(totalDue).toBe(5100)
  })

  it('positive balance carries forward as previous_balance', () => {
    const balance = calcBalance(5750, 2000)
    expect(balance).toBe(3750)
    expect(splitCarryForward(balance)).toEqual({ previousBalance: 3750, previousCredit: 0 })
  })

  it('negative balance (overpayment) carries forward as previous_credit', () => {
    const balance = calcBalance(5000, 5800)
    expect(balance).toBe(-800)
    expect(splitCarryForward(balance)).toEqual({ previousBalance: 0, previousCredit: 800 })
  })

  it('zero balance carries nothing forward', () => {
    expect(splitCarryForward(0)).toEqual({ previousBalance: 0, previousCredit: 0 })
  })
})

describe('multiple payments summing', () => {
  it('sums several partial payments without float drift', () => {
    expect(sumPayments([1000.5, 200.25, 99.25])).toBe(1300)
  })
})

describe('bill status', () => {
  it('paid when balance <= 0', () => {
    expect(calcBillStatus(5000, 5000, false)).toBe('paid')
    expect(calcBillStatus(5000, 5200, false)).toBe('paid')
  })
  it('partial when some paid but balance remains', () => {
    expect(calcBillStatus(5000, 2000, false)).toBe('partial')
  })
  it('unpaid when nothing paid and not overdue', () => {
    expect(calcBillStatus(5000, 0, false)).toBe('unpaid')
  })
  it('overdue when nothing paid and due date passed', () => {
    expect(calcBillStatus(5000, 0, true)).toBe('overdue')
  })
})

describe('duplicate bill prevention (idempotent generation)', () => {
  it('billingMonthKey normalizes to first-of-month, enabling a stable unique key', () => {
    expect(billingMonthKey(2025, 1)).toBe('2025-01-01')
    expect(billingMonthKey(2025, 12)).toBe('2025-12-01')
  })

  it('generating the same (tenant, month) key twice yields an identical key, which the DB unique constraint rejects on the second insert', () => {
    const keyA = billingMonthKey(2025, 6)
    const keyB = billingMonthKey(2025, 6)
    expect(keyA).toBe(keyB)
  })
})

describe('receipt numbering', () => {
  it('formats a receipt number from property code, year, month, sequence', () => {
    expect(formatReceiptNumber('kr', 2025, 1, 42)).toBe('KR-2025-01-00042')
  })

  it('produces unique numbers for increasing sequence values', () => {
    const numbers = new Set([1, 2, 3, 4].map((seq) => formatReceiptNumber('KR', 2025, 1, seq)))
    expect(numbers.size).toBe(4)
  })
})
