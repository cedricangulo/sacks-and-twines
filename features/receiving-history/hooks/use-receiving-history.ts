"use client"

import { useQuery } from "convex-helpers/react/cache"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { computeQuickRange } from "@/features/reports/constants"
import { formatCurrency, formatDateTime } from "@/lib/formatters"
import { matchesNumber, matchesSearch } from "@/lib/search"
import { RECEIVING_ITEMS_PER_PAGE, type ReceivingStatus } from "../constants"
import type { ReceivingBatch } from "../validation"

// Arguments for the receiving history query.
export interface UseReceivingHistoryArgs {
  dateRange: Parameters<typeof computeQuickRange>[0]
  supplierId: string
  status: ReceivingStatus
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
 *
 * Two loading flags, because they answer different questions:
 * - `isInitialLoading` — nothing has ever loaded, render the skeleton.
 * - `isLoading` — a refetch is in flight, keep the current rows visible.
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

  // Distinguishes "we have never had data" from "we are refetching".
  //
  // `convex-helpers/react/cache` returns `undefined` for the whole window
  // between an args change and the new result arriving — it has no
  // keepPreviousData. Treating that as "loading" made every filter change
  // collapse the table to a skeleton and pop it back, which read as a flicker.
  // Rendering from `isInitialLoading` instead keeps the stale page on screen
  // until real data replaces it.
  const hasLoadedOnceRef = useRef(false)

  const { startMs, endMs } = useMemo(
    () => computeQuickRange(dateRange),
    [dateRange]
  )

  const resolvedSupplierId =
    supplierId && supplierId !== "all"
      ? (supplierId as Id<"suppliers">)
      : undefined
  const resolvedStatus = status === "all" ? undefined : status

  // Stable key for every *server* query input.
  //
  // `search` is deliberately absent: it is not part of `queryArgs` below, so
  // including it here only forced a cursor reset and a pointless refetch on
  // every keystroke. The trade is that searching while paged deep filters the
  // page you are on rather than jumping back to page 1 — the filter bar copy
  // says "Search this page" to match.
  const filtersKey = useMemo(
    () =>
      JSON.stringify({
        dateRange,
        supplierId: resolvedSupplierId ?? "",
        status: resolvedStatus ?? "",
        skip,
      }),
    [dateRange, resolvedSupplierId, resolvedStatus, skip]
  )

  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey)
  // Pagination must restart at page 1 when the query changes. This uses React's
  // render-phase state adjustment pattern: the reset commits with the same
  // render that sees the new filters, so stale rows are never painted. A
  // `key={filtersKey}` remount would also drop transition state and scroll
  // position.
  if (filtersKey !== prevFiltersKey) {
    setPrevFiltersKey(filtersKey)
    setCursor(null)
    setHistory([])
    setPageNum(1)
    setIsTransitioning(false)
  }

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

  // Retain the last resolved result so a refetch does not blank the table.
  //
  // This also uses render-phase adjustment: when a fresh result arrives, the
  // retained value updates before commit, so the first render after resolution
  // already sees it. Reading the retained value only when `result` is
  // `undefined` means stale rows are never shown *instead of* fresh ones —
  // they are just not thrown away during the gap. Unlike a ref written during
  // render, an abandoned render cannot leak this update into committed UI.
  const [lastResolvedResult, setLastResolvedResult] = useState(result)
  if (result !== undefined && result !== lastResolvedResult) {
    setLastResolvedResult(result)
    if (isTransitioning) {
      setIsTransitioning(false)
    }
  }
  const shownResult = result ?? lastResolvedResult

  // `hasLoadedOnce` only tracks whether anything has ever resolved; it does not
  // affect pagination state, so it stays in an effect.
  useEffect(() => {
    if (result !== undefined) {
      hasLoadedOnceRef.current = true
    }
  }, [result])

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

  // Gated on `result`, not `shownResult`: while a refetch is in flight we must not
  // offer a Next/Prev bound to the previous page's cursor.
  const hasNext = !isTransitioning && result !== undefined && !result.isDone
  const hasPrev = !isTransitioning && history.length > 0

  const page = shownResult?.page ?? EMPTY_PAGE

  // Client-side search within the loaded pages. Same scope as dispatch history:
  // it filters what is on screen, it is not a server-side text search.
  // Every rendered column is searchable, plus the batch code, quantities, costs,
  // status and the received-at date that the details dialog shows.
  const filtered = useMemo(() => {
    if (!search) return page
    return page.filter(
      (b) =>
        matchesSearch(b.batchCode, search) ||
        matchesSearch(b.productName, search) ||
        matchesSearch(b.productSku, search) ||
        matchesSearch(b.supplierName, search) ||
        matchesSearch(b.receivedBy, search) ||
        matchesSearch(b.status, search) ||
        matchesNumber(b.quantityReceived, search) ||
        matchesNumber(b.quantityRemaining, search) ||
        matchesNumber(b.unitCost, search) ||
        matchesSearch(formatCurrency(b.unitCost), search) ||
        matchesNumber(b.totalProcurementCost, search) ||
        matchesSearch(formatCurrency(b.totalProcurementCost), search) ||
        matchesSearch(formatDateTime(b.createdAt ?? b._creationTime), search)
    )
  }, [page, search])

  return {
    page: filtered,
    rawPageLength: page.length,
    isLoading: result === undefined,
    // Stays true only until the first successful fetch, so refetches never blank
    // the table. `skip` counts as "not loaded" — there is nothing to show yet.
    isInitialLoading: result === undefined && !hasLoadedOnceRef.current,
    isTransitioning,
    pageNum,
    goNext,
    goPrev,
    hasNext,
    hasPrev,
  }
}
