"use client"

import { useQuery } from "convex-helpers/react/cache"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { computeQuickRange } from "@/features/reports/constants"
import { RECEIVING_ITEMS_PER_PAGE } from "../constants"
import type { ReceivingBatch } from "../validation"

// Arguments for the receiving history query.
export interface UseReceivingHistoryArgs {
  dateRange: Parameters<typeof computeQuickRange>[0]
  supplierId: string
  status: "all" | "active" | "depleted" | "voided"
  search: string
  skip?: boolean
}

/**
 * Stable empty page.
 *
 * `result?.page ?? []` allocates a fresh array on every render while the query
 * is unresolved, which invalidates the `filtered` memo below and re-runs the
 * search filter on every render for nothing.
 */
const EMPTY_PAGE: ReceivingBatch[] = []

/**
 * Cursor-paginated stock-in history.
 *
 * Mirrors `useAuditLogs`: a cursor stack backs the Previous button, and any
 * change to the query arguments resets pagination to page 1 via the
 * `filtersKey` effect. The server returns rows for the date range; `search` is
 * applied client-side across the loaded pages.
 */
export function useReceivingHistory({
  dateRange,
  supplierId,
  status,
  search,
  skip = false,
}: UseReceivingHistoryArgs) {
  const [cursor, setCursor] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [pageNum, setPageNum] = useState(1)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const { startMs, endMs } = useMemo(
    () => computeQuickRange(dateRange),
    [dateRange]
  )

  const resolvedSupplierId =
    supplierId && supplierId !== "all"
      ? (supplierId as Id<"suppliers">)
      : undefined
  const resolvedStatus = status === "all" ? undefined : status

  // Stable key for every query input. Including `search` means typing resets to
  // page 1 rather than filtering an arbitrary page deep in the cursor stack.
  const filtersKey = useMemo(
    () =>
      JSON.stringify({
        dateRange,
        supplierId: resolvedSupplierId ?? "",
        status: resolvedStatus ?? "",
        search,
        skip,
      }),
    [dateRange, resolvedSupplierId, resolvedStatus, search, skip]
  )

  const prevFiltersKeyRef = useRef(filtersKey)
  // Pagination must restart at page 1 when the query changes — intentional state
  // sync on input change; remounting via `key={filtersKey}` would drop the
  // transition state and scroll position.
  //
  // Flagged by `react-doctor/no-adjust-state-on-prop-change` (as is the
  // reference implementation at `use-audit-logs.ts:74-78`). Not suppressing
  // without cause: the derived-state alternative would need the cursor stack
  // keyed to the filter set, which is the state this effect already owns.
  useEffect(() => {
    if (filtersKey !== prevFiltersKeyRef.current) {
      prevFiltersKeyRef.current = filtersKey
      setCursor(null)
      setHistory([])
      setPageNum(1)
      setIsTransitioning(false)
    }
  }, [filtersKey])

  const queryArgs = useMemo(
    () =>
      skip
        ? ("skip" as const)
        : ({
            paginationOpts: {
              numItems: RECEIVING_ITEMS_PER_PAGE,
              cursor,
            },
            startMs,
            endMs,
            supplierId: resolvedSupplierId,
            status: resolvedStatus,
          } as const),
    [skip, cursor, startMs, endMs, resolvedSupplierId, resolvedStatus]
  )

  const result = useQuery(api.batches.queries.listHistory, queryArgs) as
    | {
        page: ReceivingBatch[]
        continueCursor: string
        isDone: boolean
      }
    | undefined

  // Clear the transitioning flag once Convex returns the next page.
  useEffect(() => {
    if (result !== undefined && isTransitioning) {
      setIsTransitioning(false)
    }
  }, [result, isTransitioning])

  const goNext = useCallback(() => {
    if (!result || result.isDone || isTransitioning) return
    setHistory((prev) => [...prev, cursor ?? ""])
    setCursor(result.continueCursor)
    setPageNum((prev) => prev + 1)
    setIsTransitioning(true)
  }, [result, cursor, isTransitioning])

  const goPrev = useCallback(() => {
    if (history.length === 0 || isTransitioning) return
    const newHistory = [...history]
    const prevCursorStr = newHistory.pop() ?? ""
    setCursor(prevCursorStr === "" ? null : prevCursorStr)
    setHistory(newHistory)
    setPageNum((prev) => prev - 1)
    setIsTransitioning(true)
  }, [history, isTransitioning])

  const hasNext = !isTransitioning && result !== undefined && !result.isDone
  const hasPrev = !isTransitioning && history.length > 0

  const page = result?.page ?? EMPTY_PAGE

  // Client-side search within the loaded pages. Same scope as dispatch history:
  // it filters what is on screen, it is not a server-side text search.
  const filtered = useMemo(() => {
    if (!search) return page
    const q = search.toLowerCase()
    return page.filter(
      (b) =>
        b.batchCode.toLowerCase().includes(q) ||
        b.productName.toLowerCase().includes(q) ||
        b.supplierName.toLowerCase().includes(q) ||
        b.receivedBy.toLowerCase().includes(q)
    )
  }, [page, search])

  return {
    page: filtered,
    rawPageLength: page.length,
    isLoading: result === undefined,
    isTransitioning,
    pageNum,
    goNext,
    goPrev,
    hasNext,
    hasPrev,
  }
}
