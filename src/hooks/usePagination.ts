import { useMemo, useState } from 'react'

/** Paginates an already-fetched, already-filtered array on the client —
 * the search/filter/export logic across the app's list pages runs
 * against the full result set (see LIST_QUERY_LIMIT for the network-side
 * cap), so this only slices what actually gets *rendered* per page. That
 * still matters: rendering a few thousand DOM nodes in one grid/table is
 * real, separate render cost from the network fetch itself.
 *
 * Pass `resetKey` (e.g. a search string or filter value) so the page
 * resets to 1 whenever the underlying result set changes for a reason
 * other than the user clicking Next/Prev — otherwise a fresh search
 * could silently leave the user stranded on "page 3 of 1". Reset and
 * page-count clamping both happen synchronously during render (React's
 * documented pattern for "adjust state when a prop changes") rather than
 * via an effect, so there's no extra render pass. */
export function usePagination<T>(items: T[], pageSize: number, resetKey?: string | number) {
  const [page, setPage] = useState(1)
  const [prevResetKey, setPrevResetKey] = useState(resetKey)

  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey)
    setPage(1)
  }

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const clampedPage = Math.min(page, pageCount)

  const pageItems = useMemo(() => {
    const start = (clampedPage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, clampedPage, pageSize])

  return { page: clampedPage, setPage, pageCount, pageItems, totalItems: items.length, pageSize }
}
