"use client"

import { useCallback, useMemo } from "react"
import { ITEMS_PER_PAGE } from "../constants"

/** Pagination state and controls for a table. */
export interface ReportPagination {
  page: number
  totalPages: number
  hasPrev: boolean
  hasNext: boolean
  onNext: () => void
  onPrev: () => void
  onGoToPage: (page: number) => void
  paginatedData: <T>(data: T[]) => T[]
}

/** Client-side pagination hook backed by URL state.
 * @param totalItems - Total number of items to paginate.
 * @param page - Current page number (1-indexed) from URL state.
 * @param setPage - Setter to update the page in URL state.
 */
export function useReportPagination(
  totalItems: number,
  page: number,
  setPage: (page: number) => void
): ReportPagination {
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE)),
    [totalItems]
  )

  const hasPrev = page > 1
  const hasNext = page < totalPages

  const onNext = useCallback(() => {
    setPage(Math.min(page + 1, totalPages))
  }, [page, totalPages, setPage])

  const onPrev = useCallback(() => {
    setPage(Math.max(page - 1, 1))
  }, [page, setPage])

  const onGoToPage = useCallback(
    (targetPage: number) => {
      const clamped = Math.max(1, Math.min(targetPage, totalPages))
      setPage(clamped)
    },
    [totalPages, setPage]
  )

  const paginatedData = useCallback(
    <T>(data: T[]): T[] => {
      const start = (page - 1) * ITEMS_PER_PAGE
      const end = start + ITEMS_PER_PAGE
      return data.slice(start, end)
    },
    [page]
  )

  return useMemo(
    () => ({
      page,
      totalPages,
      hasPrev,
      hasNext,
      onNext,
      onPrev,
      onGoToPage,
      paginatedData,
    }),
    [
      page,
      totalPages,
      hasPrev,
      hasNext,
      onNext,
      onPrev,
      onGoToPage,
      paginatedData,
    ]
  )
}
