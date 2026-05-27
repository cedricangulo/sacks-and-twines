"use client"

import { debounce, parseAsString, useQueryState } from "nuqs"
import { useMemo } from "react"
import type { Id } from "@/convex/_generated/dataModel"
import { getTimestampFromPreset } from "@/features/audit-logs/helpers/date-presets"
import type { AuditLogEntry, AuditLogFilters } from "./use-audit-logs"

/** URL-synced search, action, user, and date range filters for the audit log list with client-side filtering. */
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

  const resolvedDateFrom = useMemo(() => {
    if (dateFrom === "all") return undefined
    const asNumber = Number(dateFrom)
    if (!Number.isNaN(asNumber)) return asNumber
    return getTimestampFromPreset(dateFrom, Date.now())
  }, [dateFrom])

  const resolvedDateTo = useMemo(() => {
    if (dateTo === "all") return undefined
    const asNumber = Number(dateTo)
    return Number.isNaN(asNumber) ? undefined : asNumber
  }, [dateTo])

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
