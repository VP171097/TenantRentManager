import { describe, expect, it } from 'vitest'
import { meterPreview } from './meter'
import { collectionTotals } from './dashboard'
import { legacyRouteTarget, routeTitle } from './routes'

describe('quick meter: no silent negative usage or money drift', () => {
  it('calculates units and rupees', () => expect(meterPreview(1250, 1392, 9)).toEqual({ valid: true, units: 142, amount: 1278 }))
  it('keeps decimal readings exact', () => expect(meterPreview(0.1, 0.3, 9.99)).toEqual({ valid: true, units: 0.2, amount: 2 }))
  it('rejects missing, negative, non-finite and decreasing readings', () => {
    for (const value of ['', -1, 1000, Infinity, NaN] as const) expect(meterPreview(1250, value, 9).valid).toBe(false)
  })
  it('requires explicit reset and respects deferred charges', () => {
    expect(meterPreview(1250, 10, 9, true)).toEqual({ valid: true, units: 10, amount: 90 })
    expect(meterPreview(1250, 1392, 9, false, true)).toEqual({ valid: true, units: 142, amount: 0 })
  })
  it('permits an explicitly entered zero-usage reading', () => expect(meterPreview(1250, 1250, 9)).toEqual({ valid: true, units: 0, amount: 0 }))
})

describe('collection cockpit arithmetic', () => {
  it('uses one bill cohort and caps the applied percentage', () => {
    expect(collectionTotals([{ total_due: 1000, total_paid: 1200, balance: -200 }, { total_due: 1000, total_paid: 0, balance: 1000 }])).toEqual({ billed: 2000, collected: 1200, outstanding: 1000, credit: 200, collectionPercent: 50 })
  })
  it('handles empty history without NaN or fake revenue', () => expect(collectionTotals([])).toEqual({ billed: 0, collected: 0, outstanding: 0, credit: 0, collectionPercent: 0 }))
})

describe('clean routes preserve links and auth callbacks', () => {
  it('migrates old hash links with query parameters under either base', () => {
    expect(legacyRouteTarget('#/join?type=manager&token=abc', '/TenantRentManager/')).toBe('/TenantRentManager/join?type=manager&token=abc')
    expect(legacyRouteTarget('#/dashboard?property=abc', '/')).toBe('/dashboard?property=abc')
  })
  it('never consumes a Supabase token or external redirect', () => {
    expect(legacyRouteTarget('#access_token=secret&type=recovery', '/')).toBeNull()
    expect(legacyRouteTarget('#//evil.example', '/')).toBeNull()
  })
  it('gives detail routes their domain title', () => expect(routeTitle('/tenants/uuid')).toBe('Tenants · RentSlate'))
})