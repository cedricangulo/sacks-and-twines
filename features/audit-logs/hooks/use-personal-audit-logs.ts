"use client"

import { useQuery } from "convex-helpers/react/cache"
import { useCallback, useEffect, useMemo, useState } from "react"
import { api } from "@/convex/_generated/api"
import { ITEMS_PER_PAGE } from "../constants"
import type { AuditLogEntry } from "./use-audit-logs"

export function usePersonalAuditLogs(skip = false) {
  const [cursor, setCursor] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [pageNum, setPageNum] = useState(1)
  const [maxPage, setMaxPage] = useState(1)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const queryArgs = useMemo(
    () =>
      skip
        ? ("skip" as const)
        : ({ paginationOpts: { numItems: ITEMS_PER_PAGE, cursor } } as const),
    [skip, cursor]
  )

  const result = useQuery(api.auditLogs.queries.listByUser, queryArgs) as
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
  }
}
