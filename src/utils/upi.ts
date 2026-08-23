// Pure helpers for UPI payment links and identifier detection. Kept
// dependency-free so they're easy to unit test (see upi.test.ts).

/** Basic (non-strict) UPI VPA format check: name@bank, e.g. vivek@okhdfcbank */
export function isValidUpiId(upiId: string): boolean {
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}$/.test(upiId.trim())
}

export interface UpiLinkInput {
  upiId: string
  payeeName: string
  amount: number
  note: string
}

/** Builds a `upi://pay` deep link that any UPI app can open to pre-fill a payment. */
export function buildUpiLink({ upiId, payeeName, amount, note }: UpiLinkInput): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount > 0 ? amount.toFixed(2) : '0.00',
    cu: 'INR',
    tn: note,
  })
  return `upi://pay?${params.toString()}`
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Distinguishes an email-looking login identifier from a phone number. */
export function isEmailIdentifier(identifier: string): boolean {
  return EMAIL_RE.test(identifier.trim())
}

/** Normalizes a bare 10-digit Indian mobile number to E.164 (+91...);
 * leaves anything already starting with '+' untouched. */
export function normalizePhoneIdentifier(identifier: string): string {
  const trimmed = identifier.trim()
  if (trimmed.startsWith('+')) return trimmed.replace(/[\s-]/g, '')
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  return `+${digits}`
}
