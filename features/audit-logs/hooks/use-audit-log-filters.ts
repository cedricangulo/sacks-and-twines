"use client"

import { parseAsString, useQueryState } from "nuqs"
import { useMemo } from "react"
import type { Id } from "@/convex/_generated/dataModel"
import { getTimestampFromPreset } from "@/features/audit-logs/helpers/date-presets"
import { formatDateTime } from "@/lib/formatters"
import { matchesSearch, normalizeSearchTerm } from "@/lib/search"
import type { AuditLogEntry, AuditLogFilters } from "./use-audit-logs"

// URL-synced search, action, user, and date range filters for the audit log list with client-side filtering.
export function useAuditLogFilters(logs: AuditLogEntry[] | undefined) {
  const [rawSearch, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("").withOptions({
      history: "replace",
    })
  )

  const [action, setAction] = useQueryState(
    "action",
    parseAsString.withDefault("all").withOptions({
      history: "replace",
    })
  )

  const [userId, setUserId] = useQueryState(
    "userId",
    parseAsString.withDefault("all").withOptions({
      history: "replace",
    })
  )

  const [dateFrom, setDateFrom] = useQueryState(
    "dateFrom",
    parseAsString.withDefault("all").withOptions({
      history: "replace",
    })
  )

  const [dateTo, setDateTo] = useQueryState(
    "dateTo",
    parseAsString.withDefault("all").withOptions({
      history: "replace",
    })
  )

  // Normalized once here so the input and the results describe the same term.
  const search = normalizeSearchTerm(rawSearch)

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

  // Client-side residue over the already-fetched page.
  //
  // This is a *narrowing* pass, not the filter itself: `useAuditLogs` pushes
  // `search` to `auditLogs.queries.list`, which does the real matching. That
  // server predicate previously covered only `action` and `description` even
  // though this code also matched `userName` — so an actor name typed here was
  // silently discarded before it ever reached this memo, and appeared to find
  // nothing. The server now matches `userName` too (the join is hoisted above
  // the predicate); this pass is retained so the two stay consistent.
  const filtered = useMemo(() => {
    if (!logs) return undefined
    if (!search) return logs
    return logs.filter(
      (log) =>
        matchesSearch(log.userName, search) ||
        matchesSearch(log.action, search) ||
        matchesSearch(log.description, search) ||
        matchesSearch(log.resourceType, search) ||
        matchesSearch(log.resourceId, search) ||
        matchesSearch(log.ipAddress, search) ||
        matchesSearch(log.userAgent, search) ||
        matchesSearch(
          formatDateTime(log.createdAt ?? log._creationTime),
          search
        )
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
