export const PASSWORD_MIN_LENGTH = 8

/** Basic password rules: minimum length, and at least one letter + one
 * number. Returns a user-facing error message, or null if the password is
 * acceptable. Kept intentionally simple — this is a small landlord/tenant
 * app, not a bank. */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  }
  if (!/[a-zA-Z]/.test(password)) return 'Password must include at least one letter.'
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.'
  return null
}

export function passwordsMatchError(password: string, confirm: string): string | null {
  return password === confirm ? null : 'Passwords do not match.'
}
