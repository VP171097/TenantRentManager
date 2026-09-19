import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePagination } from './usePagination'

describe('usePagination', () => {
  it('slices items into pages', () => {
    const items = Array.from({ length: 55 }, (_, i) => i)
    const { result } = renderHook(() => usePagination(items, 20))
    expect(result.current.pageCount).toBe(3)
    expect(result.current.pageItems).toEqual(items.slice(0, 20))
    expect(result.current.totalItems).toBe(55)
  })

  it('navigates to the next page', () => {
    const items = Array.from({ length: 55 }, (_, i) => i)
    const { result } = renderHook(() => usePagination(items, 20))
    act(() => result.current.setPage(2))
    expect(result.current.page).toBe(2)
    expect(result.current.pageItems).toEqual(items.slice(20, 40))
  })

  it('clamps to the last page if items shrink below the current page', () => {
    const { result, rerender } = renderHook(({ items }) => usePagination(items, 20), {
      initialProps: { items: Array.from({ length: 55 }, (_, i) => i) },
    })
    act(() => result.current.setPage(3))
    expect(result.current.page).toBe(3)

    rerender({ items: Array.from({ length: 10 }, (_, i) => i) })
    expect(result.current.pageCount).toBe(1)
    expect(result.current.page).toBe(1)
  })

  it('resets to page 1 when resetKey changes (e.g. a new search)', () => {
    const items = Array.from({ length: 55 }, (_, i) => i)
    const { result, rerender } = renderHook(({ key }) => usePagination(items, 20, key), {
      initialProps: { key: 'a' },
    })
    act(() => result.current.setPage(3))
    expect(result.current.page).toBe(3)

    rerender({ key: 'b' })
    expect(result.current.page).toBe(1)
  })

  it('never reports fewer than 1 page, even when empty', () => {
    const { result } = renderHook(() => usePagination([] as number[], 20))
    expect(result.current.pageCount).toBe(1)
    expect(result.current.pageItems).toEqual([])
  })
})
