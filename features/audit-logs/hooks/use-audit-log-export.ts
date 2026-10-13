"use client"

import { useMutation } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import { useQueries } from "convex-helpers/react/cache"
import { useState } from "react"
import { api } from "@/convex/_generated/api"
import type { Doc } from "@/convex/_generated/dataModel"
import { AUDIT_LOG_ACTIONS } from "@/convex/lib/constants"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"
import { escapeCsv } from "@/lib/csv"
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
type EnrichedAuditLog = Doc<"auditLogs"> & {
  userName: string | null
  userEmail: string | null
  userRole: string | null
}

const formatAsJson = (data: {
  records: EnrichedAuditLog[]
  truncated: boolean
  limit: number
}) => {
  const pick = (log: EnrichedAuditLog): Record<string, unknown> => ({
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
  // The truncation flag travels with the payload — a downstream reader must not
  // be able to mistake a capped result set for the complete audit trail.
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      truncated: data.truncated,
      limit: data.limit,
      recordCount: data.records.length,
      records: data.records.map(pick),
    },
    null,
    2
  )
}

type ExportFormat = "csv" | "json"

// Query args for the export query: only defined filters travel, so an empty
// search or "all" action never constrains the export.
function buildExportArgs(search: string, filterArgs: AuditLogFilters) {
  return {
    ...(search ? { search } : {}),
    ...(filterArgs.action ? { action: filterArgs.action } : {}),
    ...(filterArgs.userId ? { userId: filterArgs.userId } : {}),
    ...(filterArgs.dateFrom !== undefined
      ? { dateFrom: filterArgs.dateFrom }
      : {}),
    ...(filterArgs.dateTo !== undefined ? { dateTo: filterArgs.dateTo } : {}),
  }
}

type ExportPayload = Awaited<
  FunctionReturnType<typeof api.auditLogs.queries.exportData>
>

// Splits the cached query result into failure vs data. Kept outside the hook
// so the hook body stays a flat sequence of state + query + handlers.
function resolveExportData(exportResult: unknown): {
  exportFailed: boolean
  exportError: string | null
  exportData: ExportPayload | undefined
} {
  const exportFailed = exportResult instanceof Error
  return {
    exportFailed,
    exportError: exportFailed ? (exportResult as Error).message : null,
    exportData: exportFailed
      ? undefined
      : (exportResult as ExportPayload | undefined),
  }
}

// Browser download for formatted export content. The object URL is revoked
// synchronously after the click, so the blob never outlives the download.
function downloadExportFile({
  content,
  mimeType,
  extension,
}: {
  content: string
  mimeType: string
  extension: string
}) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.${extension}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Human-readable summary of the active export filters for the confirm dialog.
function buildSummaryLines(
  search: string,
  filterArgs: AuditLogFilters,
  selectedFormat: ExportFormat
): string[] {
  const lines: string[] = [formatPeriodLine(filterArgs)]
  lines.push(
    `Action: ${filterArgs.action && filterArgs.action !== "all" ? filterArgs.action : "All actions"}`
  )
  lines.push(`Search: ${search || "None"}`)
  lines.push(
    `Format: ${selectedFormat === "csv" ? "CSV (.csv)" : "JSON (.json)"}`
  )
  return lines
}

// "Time period" summary line: formatted range when bounded, "All time" when not.
function formatPeriodLine(filterArgs: AuditLogFilters): string {
  if (!filterArgs.dateFrom && !filterArgs.dateTo) {
    return "Time period: All time"
  }
  const from = filterArgs.dateFrom
    ? AUDIT_DATE_FMT.format(new Date(filterArgs.dateFrom))
    : "earliest"
  const to = filterArgs.dateTo
    ? AUDIT_DATE_FMT.format(new Date(filterArgs.dateTo))
    : "latest"
  return `Time period: ${from} – ${to}`
}

// Manages audit log export: fetches filtered data from Convex, formats as CSV/JSON, and triggers a browser download.
export function useAuditLogExport(search: string, filterArgs: AuditLogFilters) {
  const { isAuthenticated } = useCurrentUser()
  const [isExporting, setIsExporting] = useState(false)
  const logExport = useMutation(api.auditLogs.mutations.logExport)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("csv")

  const actions = AUDIT_LOG_ACTIONS

  const exportResult = useQueries(
    isAuthenticated && (exportMenuOpen || exportDialogOpen)
      ? {
          _default: {
            query: api.auditLogs.queries.exportData,
            args: buildExportArgs(search, filterArgs),
          },
        }
      : {}
  )._default

  const { exportFailed, exportError, exportData } =
    resolveExportData(exportResult)

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
    downloadExportFile({
      content: isCsv
        ? formatAsCsv(exportData.records)
        : formatAsJson(exportData),
      mimeType: isCsv
        ? "text/csv;charset=utf-8"
        : "application/json;charset=utf-8",
      extension: isCsv ? "csv" : "json",
    })

    logExport({
      format: selectedFormat,
      recordCount: exportData.records.length,
      truncated: exportData.truncated,
      filters: JSON.stringify({
        search: search || undefined,
        action: filterArgs.action,
        dateFrom: filterArgs.dateFrom,
        dateTo: filterArgs.dateTo,
      }),
    })

    setTimeout(() => setIsExporting(false), 500)
  }

  const recordCount = exportData?.records.length ?? 0
  const summaryLines = buildSummaryLines(search, filterArgs, selectedFormat)

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
