"use client"

import { useQuery } from "convex-helpers/react/cache"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { ITEMS_PER_PAGE } from "../constants"

export interface AuditLogEntry {
  _id: Id<"auditLogs">
  _creationTime: number
  userId?: Id<"users">
  action: string
  description: string
  resourceType?: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  createdAt?: number
  userName: string | null
}

export interface AuditLogFilters {
  action?: string
  userId?: Id<"users">
  dateFrom?: number
  dateTo?: number
}

export function useAuditLogs(filters: AuditLogFilters, skip = false) {
  const [cursor, setCursor] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [pageNum, setPageNum] = useState(1)
  const [maxPage, setMaxPage] = useState(1)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const filtersKey =
    filters.action +
    "|" +
    (filters.userId ?? "") +
    "|" +
    (filters.dateFrom ?? "") +
    "|" +
    (filters.dateTo ?? "")

  const prevFiltersKeyRef = useRef(filtersKey)
  if (filtersKey !== prevFiltersKeyRef.current) {
    prevFiltersKeyRef.current = filtersKey
    setCursor(null)
    setHistory([])
    setPageNum(1)
    setMaxPage(1)
    setIsTransitioning(false)
  }

  const queryArgs = useMemo(
    () =>
      skip
        ? ("skip" as const)
        : ({
            paginationOpts: { numItems: ITEMS_PER_PAGE, cursor },
            action: filters.action,
            userId: filters.userId,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
          } as const),
    [
      skip,
      cursor,
      filters.action,
      filters.userId,
      filters.dateFrom,
      filters.dateTo,
    ]
  )

  const result = useQuery(api.auditLogs.queries.list, queryArgs) as
    | { page: AuditLogEntry[]; continueCursor: string; isDone: boolean }
    | undefined

  useEffect(() => {
    if (result !== undefined && isTransitioning) {
      setIsTransitioning(false)
    }
  }, [result, isTransitioning])

  const goNext = useCallback(() => {
    if (!result || result.isDone || isTransitioning) return
    setHistory((prev) => [...prev, cursor ?? ""])
    setCursor(result.continueCursor)
    setPageNum((prev) => {
      const next = prev + 1
      setMaxPage((m) => Math.max(m, next))
      return next
    })
    setIsTransitioning(true)
  }, [result, cursor, isTransitioning])

  const goPrev = useCallback(() => {
    if (history.length === 0 || isTransitioning) return
    const newHistory = [...history]
    const prevCursorStr = newHistory.pop()!
    setCursor(prevCursorStr === "" ? null : prevCursorStr)
    setHistory(newHistory)
    setPageNum((prev) => prev - 1)
    setIsTransitioning(true)
  }, [history, isTransitioning])

  const reset = useCallback(() => {
    setCursor(null)
    setHistory([])
    setPageNum(1)
    setMaxPage(1)
    setIsTransitioning(false)
  }, [])

  const hasNext =
    !isTransitioning &&
    (pageNum < maxPage || (result !== undefined && !result.isDone))
  const hasPrev = !isTransitioning && history.length > 0

  return {
    page: result?.page ?? [],
    isLoading: result === undefined,
    pageNum,
    goNext,
    goPrev,
    hasNext,
    hasPrev,
    reset,
  }
}
