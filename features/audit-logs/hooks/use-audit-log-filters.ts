"use client"

import { debounce, parseAsString, useQueryState } from "nuqs"
import { useMemo } from "react"
import type { Id } from "@/convex/_generated/dataModel"
import type { AuditLogEntry, AuditLogFilters } from "./use-audit-logs"

export function useAuditLogFilters(logs: AuditLogEntry[] | undefined) {
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({
      history: "replace",
      shallow: false,
      limitUrlUpdates: debounce(300),
    })
  )

  const [action, setAction] = useQueryState(
    "action",
    parseAsString.withDefault("all").withOptions({
      history: "replace",
      shallow: false,
    })
  )

  const [userId, setUserId] = useQueryState(
    "userId",
    parseAsString.withDefault("all").withOptions({
      history: "replace",
      shallow: false,
    })
  )

  const [dateFrom, setDateFrom] = useQueryState(
    "dateFrom",
    parseAsString.withDefault("all").withOptions({
      history: "replace",
      shallow: false,
    })
  )

  const [dateTo, setDateTo] = useQueryState(
    "dateTo",
    parseAsString.withDefault("all").withOptions({
      history: "replace",
      shallow: false,
    })
  )

  const hasActiveFilters =
    search !== "" ||
    action !== "all" ||
    userId !== "all" ||
    dateFrom !== "all" ||
    dateTo !== "all"

  const getTimestampFromPreset = (preset: string): number | undefined => {
    const now = Date.now()
    switch (preset) {
      case "today": {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        return d.getTime()
      }
      case "7d":
        return now - 7 * 86400000
      case "30d":
        return now - 30 * 86400000
      default:
        return undefined
    }
  }

  const resolvedDateFrom =
    dateFrom !== "all"
      ? Number(dateFrom) || getTimestampFromPreset(dateFrom)
      : undefined
  const resolvedDateTo = dateTo !== "all" ? Number(dateTo) : undefined

  const filterArgs: AuditLogFilters = useMemo(
    () => ({
      action: action !== "all" ? action : undefined,
      userId: userId !== "all" ? (userId as Id<"users">) : undefined,
      dateFrom: resolvedDateFrom,
      dateTo: resolvedDateTo,
    }),
    [action, userId, resolvedDateFrom, resolvedDateTo]
  )

  const filtered = useMemo(() => {
    if (!logs) return undefined
    if (!search) return logs
    const q = search.toLowerCase()
    return logs.filter(
      (log) =>
        (log.userName ?? "").toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q)
    )
  }, [logs, search])

  const clearFilters = () => {
    setSearch("")
    setAction("all")
    setUserId("all")
    setDateFrom("all")
    setDateTo("all")
  }

  const setFilters = (updates: Partial<AuditLogFilters>) => {
    if (updates.action !== undefined) setAction(updates.action ?? "all")
    if (updates.userId !== undefined)
      setUserId((updates.userId as string) ?? "all")
    if (updates.dateFrom !== undefined)
      setDateFrom(String(updates.dateFrom ?? "all"))
    if (updates.dateTo !== undefined) setDateTo(String(updates.dateTo ?? "all"))
  }

  return {
    search,
    setSearch,
    action,
    userId,
    setUserId,
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    setFilters,
    filtered,
    filterArgs,
    hasActiveFilters,
    clearFilters,
  }
}
