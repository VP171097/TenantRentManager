import { beforeEach, describe, expect, it, vi } from 'vitest'
const { from, rpc, upsert, existing } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), upsert: vi.fn(), existing: [{ id: 'bill-kept', tenant_id: 'tenant-1', total_due: 5000 }] }))
vi.mock('../lib/supabase', () => ({ supabase: { from, rpc } }))
import { generateBillsForProperty } from './billing'
const input = { tenant_id: 'tenant-1', room_id: 'room-1', last_reading: 100, current_reading: 200, rate_per_unit: 9, skip_electricity: false, electricity_enabled: true }
beforeEach(() => {
  vi.clearAllMocks()
  const query = { select: vi.fn(), eq: vi.fn(), in: vi.fn().mockResolvedValue({ data: existing, error: null }), upsert }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  from.mockReturnValue(query)
})
describe('bulk generation record preservation', () => {
  it('never writes readings or regenerates a bill already present', async () => {
    expect(await generateBillsForProperty('property-1', '2026-09-01', [input])).toEqual(existing)
    expect(upsert).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })
  it('rejects an invalid batch before any database access', async () => {
    await expect(generateBillsForProperty('property-1', '2026-09-01', [{ ...input, current_reading: 50 }])).rejects.toThrow('Check meter')
    expect(from).not.toHaveBeenCalled()
  })
})