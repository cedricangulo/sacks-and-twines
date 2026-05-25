"use client"

import { useQuery } from "convex-helpers/react/cache"
import { useCallback, useMemo, useState } from "react"
import { api } from "@/convex/_generated/api"
import { ITEMS_PER_PAGE } from "../constants"
import type { AuditLogEntry } from "./use-audit-logs"

export function usePersonalAuditLogs(skip = false) {
  const [state, setState] = useState(() => ({
    skip,
    cursor: null as string | null,
    history: [] as string[],
    pageNum: 1,
    maxPage: 1,
    isTransitioning: false,
  }))

  if (state.skip !== skip) {
    setState({
      skip,
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
        : ({ paginationOpts: { numItems: ITEMS_PER_PAGE, cursor } } as const),
    [skip, cursor]
  )

  const result = useQuery(api.auditLogs.queries.listByUser, queryArgs) as
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
  }
}
