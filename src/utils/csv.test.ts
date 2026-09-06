import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('builds a header row plus one row per record', () => {
    const csv = toCsv(
      [
        { name: 'Alice', amount: 100 },
        { name: 'Bob', amount: 200 },
      ],
      [
        { key: 'name', label: 'Name' },
        { key: 'amount', label: 'Amount' },
      ]
    )
    expect(csv).toBe('Name,Amount\nAlice,100\nBob,200')
  })

  it('quotes values containing commas', () => {
    const csv = toCsv([{ name: 'Doe, John' }], [{ key: 'name', label: 'Name' }])
    expect(csv).toBe('Name\n"Doe, John"')
  })

  it('quotes and escapes values containing double quotes', () => {
    const csv = toCsv([{ note: 'He said "hi"' }], [{ key: 'note', label: 'Note' }])
    expect(csv).toBe('Note\n"He said ""hi"""')
  })

  it('quotes values containing newlines', () => {
    const csv = toCsv([{ note: 'line1\nline2' }], [{ key: 'note', label: 'Note' }])
    expect(csv).toBe('Note\n"line1\nline2"')
  })

  it('renders null/undefined values as empty strings', () => {
    const csv = toCsv([{ note: null }, { note: undefined }], [{ key: 'note', label: 'Note' }])
    expect(csv).toBe('Note\n\n')
  })

  it('handles an empty row set (header only)', () => {
    const csv = toCsv([], [{ key: 'name', label: 'Name' }])
    expect(csv).toBe('Name\n')
  })
})
