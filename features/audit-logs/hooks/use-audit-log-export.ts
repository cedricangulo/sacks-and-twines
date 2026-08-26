"use client"

import { useMutation } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import { useQueries, useQuery } from "convex-helpers/react/cache"
import { useMemo, useState } from "react"
import { api } from "@/convex/_generated/api"
import type { Doc } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"
import type { AuditLogFilters } from "./use-audit-logs"

// Extracts the "summary" field from a JSON-encoded description string.
const extractSummary = (description: string | null | undefined): string => {
  if (!description) return ""
  try {
    const parsed = JSON.parse(description)
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.summary === "string"
    ) {
      return parsed.summary
    }
  } catch {
    // not JSON, use as-is
  }
  return description
}

// Escapes a value for CSV output (handles commas, quotes, newlines).
const escapeCsv = (val: string | number | null | undefined): string => {
  if (val === null || val === undefined) return ""
  const s = String(val)
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

// Formats audit log data as a CSV string with a BOM for Excel compatibility.
const formatAsCsv = (
  data: Array<
    Doc<"auditLogs"> & {
      userName: string | null
      userEmail: string | null
      userRole: string | null
    }
  >
) => {
  const header = [
    "Timestamp",
    "User",
    "Email",
    "Role",
    "Action",
    "Resource Type",
    "Resource ID",
    "Description",
    "IP Address",
    "User Agent",
  ]

  const rows = data.map((log) =>
    [
      log.createdAt ?? log._creationTime,
      log.userName,
      log.userEmail,
      log.userRole,
      log.action,
      log.resourceType,
      log.resourceId,
      extractSummary(log.description),
      log.ipAddress,
      log.userAgent,
    ]
      .map(escapeCsv)
      .join(",")
  )

  return "\uFEFF" + header.join(",") + "\n" + rows.join("\n")
}

/** Hoisted formatter — `en-PH` + `Asia/Manila` avoids hydration mismatch vs `toLocaleDateString()` default. */
const AUDIT_DATE_FMT = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "Asia/Manila",
})

// Formats audit log data as a formatted JSON string.
const formatAsJson = (
  data: Array<
    Doc<"auditLogs"> & {
      userName: string | null
      userEmail: string | null
      userRole: string | null
    }
  >
) => {
  const pick = (log: (typeof data)[number]): Record<string, unknown> => ({
    timestamp: log.createdAt ?? log._creationTime,
    user: log.userName,
    email: log.userEmail,
    role: log.userRole,
    action: log.action,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    description: extractSummary(log.description),
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
  })
  return JSON.stringify(data.map(pick), null, 2)
}

type ExportFormat = "csv" | "json"

// Manages audit log export: fetches filtered data from Convex, formats as CSV/JSON, and triggers a browser download.
export function useAuditLogExport(search: string, filterArgs: AuditLogFilters) {
  const { isAuthenticated } = useCurrentUser()
  const [isExporting, setIsExporting] = useState(false)
  const logExport = useMutation(api.auditLogs.mutations.logExport)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("csv")

  const actionsArgs = useMemo(
    () => (isAuthenticated ? {} : "skip"),
    [isAuthenticated]
  )

  const actions =
    (useQuery(api.auditLogs.queries.listActions, actionsArgs) as
      | string[]
      | undefined) ?? []

  const exportResult = useQueries(
    isAuthenticated && (exportMenuOpen || exportDialogOpen)
      ? {
          _default: {
            query: api.auditLogs.queries.exportData,
            args: {
              ...(search ? { search } : {}),
              ...(filterArgs.action ? { action: filterArgs.action } : {}),
              ...(filterArgs.userId ? { userId: filterArgs.userId } : {}),
              ...(filterArgs.dateFrom !== undefined
                ? { dateFrom: filterArgs.dateFrom }
                : {}),
              ...(filterArgs.dateTo !== undefined
                ? { dateTo: filterArgs.dateTo }
                : {}),
            },
          },
        }
      : {}
  )._default

  const exportFailed = exportResult instanceof Error
  const exportError = exportFailed ? (exportResult as Error).message : null
  const exportData = exportFailed
    ? undefined
    : (exportResult as
        | Awaited<FunctionReturnType<typeof api.auditLogs.queries.exportData>>
        | undefined)

  const handleFormatSelect = (format: ExportFormat) => {
    setSelectedFormat(format)
    setExportMenuOpen(false)
    setExportDialogOpen(true)
  }

  const handleExportConfirm = () => {
    if (!exportData) return
    setIsExporting(true)
    setExportDialogOpen(false)

    const isCsv = selectedFormat === "csv"
    const content = isCsv ? formatAsCsv(exportData) : formatAsJson(exportData)
    const mimeType = isCsv
      ? "text/csv;charset=utf-8"
      : "application/json;charset=utf-8"
    const extension = isCsv ? "csv" : "json"

    logExport({
      format: selectedFormat,
      recordCount: recordCount,
      filters: JSON.stringify({
        search: search || undefined,
        action: filterArgs.action,
        dateFrom: filterArgs.dateFrom,
        dateTo: filterArgs.dateTo,
      }),
    })

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setTimeout(() => setIsExporting(false), 500)
  }

  const recordCount = exportData?.length ?? 0

  const summaryLines: string[] = []
  if (filterArgs.dateFrom || filterArgs.dateTo) {
    const from = filterArgs.dateFrom
      ? AUDIT_DATE_FMT.format(new Date(filterArgs.dateFrom))
      : "earliest"
    const to = filterArgs.dateTo
      ? AUDIT_DATE_FMT.format(new Date(filterArgs.dateTo))
      : "latest"
    summaryLines.push(`Time period: ${from} – ${to}`)
  } else {
    summaryLines.push("Time period: All time")
  }
  summaryLines.push(
    `Action: ${filterArgs.action && filterArgs.action !== "all" ? filterArgs.action : "All actions"}`
  )
  summaryLines.push(`Search: ${search || "None"}`)
  summaryLines.push(
    `Format: ${selectedFormat === "csv" ? "CSV (.csv)" : "JSON (.json)"}`
  )

  return {
    actions,
    isExporting,
    exportMenuOpen,
    setExportMenuOpen,
    exportDialogOpen,
    setExportDialogOpen,
    handleFormatSelect,
    handleExportConfirm,
    recordCount,
    summaryLines,
    exportResult: exportData,
    exportFailed,
    exportError,
  }
}
