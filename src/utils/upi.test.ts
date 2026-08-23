import { describe, it, expect } from 'vitest'
import { isValidUpiId, buildUpiLink, isEmailIdentifier, normalizePhoneIdentifier } from './upi'

describe('isValidUpiId', () => {
  it('accepts plausible UPI ids', () => {
    expect(isValidUpiId('vivek@okhdfcbank')).toBe(true)
    expect(isValidUpiId('vivek.kumar_1@okaxis')).toBe(true)
  })
  it('rejects invalid formats', () => {
    expect(isValidUpiId('not-a-upi-id')).toBe(false)
    expect(isValidUpiId('vivek@')).toBe(false)
    expect(isValidUpiId('@okhdfcbank')).toBe(false)
    expect(isValidUpiId('')).toBe(false)
  })
})

describe('buildUpiLink', () => {
  it('builds a upi://pay deep link with encoded params', () => {
    const link = buildUpiLink({ upiId: 'vivek@okhdfcbank', payeeName: 'Vivek Kumar', amount: 1500, note: 'Rent Jan 2026' })
    expect(link.startsWith('upi://pay?')).toBe(true)
    expect(link).toContain('pa=vivek%40okhdfcbank')
    expect(link).toContain('am=1500.00')
    expect(link).toContain('cu=INR')
    expect(link).toContain('tn=Rent+Jan+2026')
  })
  it('clamps non-positive amounts to 0.00', () => {
    const link = buildUpiLink({ upiId: 'a@b', payeeName: 'X', amount: -5, note: 'n' })
    expect(link).toContain('am=0.00')
  })
})

describe('isEmailIdentifier', () => {
  it('detects emails', () => {
    expect(isEmailIdentifier('tenant@example.com')).toBe(true)
    expect(isEmailIdentifier('9876543210')).toBe(false)
    expect(isEmailIdentifier('+919876543210')).toBe(false)
  })
})

describe('normalizePhoneIdentifier', () => {
  it('prefixes bare 10-digit Indian numbers with +91', () => {
    expect(normalizePhoneIdentifier('9876543210')).toBe('+919876543210')
  })
  it('leaves already-E.164 numbers untouched', () => {
    expect(normalizePhoneIdentifier('+919876543210')).toBe('+919876543210')
  })
  it('strips spaces/dashes', () => {
    expect(normalizePhoneIdentifier('+91 98765-43210')).toBe('+919876543210')
  })
})
