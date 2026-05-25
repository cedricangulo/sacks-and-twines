"use client"

import { useQuery } from "convex-helpers/react/cache"
import { useCallback, useMemo, useState } from "react"
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

export function useAuditLogs(
  filters: AuditLogFilters,
  search: string,
  skip = false
) {
  const filtersKey =
    search +
    "|" +
    (filters.action ?? "") +
    "|" +
    (filters.userId ?? "") +
    "|" +
    (filters.dateFrom ?? "") +
    "|" +
    (filters.dateTo ?? "")

  const [state, setState] = useState(() => ({
    filtersKey,
    cursor: null as string | null,
    history: [] as string[],
    pageNum: 1,
    maxPage: 1,
    isTransitioning: false,
  }))

  if (state.filtersKey !== filtersKey) {
    setState({
      filtersKey,
      cursor: null,
      history: [],
      pageNum: 1,
      maxPage: 1,
      isTransitioning: false,
    })
  }

  const { cursor, history, pageNum, maxPage, isTransitioning } = state

  const queryArgs = useMemo(
    () =>
      skip
        ? ("skip" as const)
        : ({
            paginationOpts: { numItems: ITEMS_PER_PAGE, cursor },
            search: search || undefined,
            action: filters.action,
            userId: filters.userId,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
          } as const),
    [
      skip,
      cursor,
      search,
      filters.action,
      filters.userId,
      filters.dateFrom,
      filters.dateTo,
    ]
  )

  const result = useQuery(api.auditLogs.queries.list, queryArgs) as
    | { page: AuditLogEntry[]; continueCursor: string; isDone: boolean }
    | undefined

  const isLoading = result === undefined
  const transitioning = isTransitioning && isLoading

  const goNext = useCallback(() => {
    if (!result || result.isDone || isTransitioning) return
    setState((prev) => {
      const nextPageNum = prev.pageNum + 1
      return {
        ...prev,
        cursor: result.continueCursor,
        history: [...prev.history, prev.cursor ?? ""],
        pageNum: nextPageNum,
        maxPage: Math.max(prev.maxPage, nextPageNum),
        isTransitioning: true,
      }
    })
  }, [result, isTransitioning])

  const goPrev = useCallback(() => {
    if (history.length === 0 || isTransitioning) return
    setState((prev) => {
      const nextHistory = [...prev.history]
      const prevCursorStr = nextHistory.pop()!
      return {
        ...prev,
        cursor: prevCursorStr === "" ? null : prevCursorStr,
        history: nextHistory,
        pageNum: prev.pageNum - 1,
        isTransitioning: true,
      }
    })
  }, [history, isTransitioning])

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      cursor: null,
      history: [],
      pageNum: 1,
      maxPage: 1,
      isTransitioning: false,
      filtersKey,
    }))
  }, [filtersKey])

  const hasNext =
    !transitioning &&
    (pageNum < maxPage || (result !== undefined && !result.isDone))
  const hasPrev = !transitioning && history.length > 0

  return {
    page: result?.page ?? [],
    isLoading,
    pageNum,
    goNext,
    goPrev,
    hasNext,
    hasPrev,
    reset,
  }
}
