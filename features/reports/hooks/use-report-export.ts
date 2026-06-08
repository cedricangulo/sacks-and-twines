"use client"

import type { FunctionReturnType } from "convex/server"
import { useQuery } from "convex-helpers/react/cache"
import { useCallback, useMemo, useState } from "react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import { downloadCsv, formatCsv } from "@/lib/csv"
import {
  computeQuickRange,
  EXPORT_COLUMN_MAP,
  EXPORT_ENTITY_NAMES,
  type ExportEntity,
  type QuickRange,
} from "../constants"

function formatTimestamp(ms: number): string {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(ms))
}

export function useReportExport(entity: ExportEntity | null) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(() => {
    if (!entity) return new Set()
    return new Set(EXPORT_COLUMN_MAP[entity].map((c) => c.id))
  })

  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState("00:00")
  const [endTime, setEndTime] = useState("23:59")

  const needsDateFilter = entity !== null

  const startMs = useMemo(() => {
    if (!startDate) return 0
    const [h, m] = startTime.split(":").map(Number)
    const d = new Date(startDate)
    d.setHours(h, m, 0, 0)
    return d.getTime()
  }, [startDate, startTime])

  const endMs = useMemo(() => {
    if (!endDate) return Infinity
    const [h, m] = endTime.split(":").map(Number)
    const d = new Date(endDate)
    d.setHours(h, m, 59, 999)
    return d.getTime()
  }, [endDate, endTime])

  const shouldFetch = entity !== null && dialogOpen

  const products = useQuery(
    api.reports.queries.exportProducts,
    shouldFetch && entity === "products" ? { startMs, endMs } : "skip"
  ) as
    | Awaited<FunctionReturnType<typeof api.reports.queries.exportProducts>>
    | undefined

  const batches = useQuery(
    api.reports.queries.exportBatches,
    shouldFetch && entity === "batches" ? { startMs, endMs } : "skip"
  ) as
    | Awaited<FunctionReturnType<typeof api.reports.queries.exportBatches>>
    | undefined

  const suppliers = useQuery(
    api.reports.queries.exportSuppliers,
    shouldFetch && entity === "suppliers" ? { startMs, endMs } : "skip"
  ) as
    | Awaited<FunctionReturnType<typeof api.reports.queries.exportSuppliers>>
    | undefined

  const dispatches = useQuery(
    api.reports.queries.exportDispatches,
    shouldFetch && entity === "dispatches" ? { startMs, endMs } : "skip"
  ) as
    | Awaited<FunctionReturnType<typeof api.reports.queries.exportDispatches>>
    | undefined

  const dispatchItems = useQuery(
    api.reports.queries.exportDispatchItems,
    shouldFetch && entity === "dispatchItems" ? { startMs, endMs } : "skip"
  ) as
    | Awaited<
        FunctionReturnType<typeof api.reports.queries.exportDispatchItems>
      >
    | undefined

  const adjustments = useQuery(
    api.reports.queries.exportAdjustments,
    shouldFetch && entity === "adjustments" ? { startMs, endMs } : "skip"
  ) as
    | Awaited<FunctionReturnType<typeof api.reports.queries.exportAdjustments>>
    | undefined

  const data = ((entity === "products" ? products : null) ??
    (entity === "batches" ? batches : null) ??
    (entity === "suppliers" ? suppliers : null) ??
    (entity === "dispatches" ? dispatches : null) ??
    (entity === "dispatchItems" ? dispatchItems : null) ??
    (entity === "adjustments" ? adjustments : null)) as
    | Record<string, unknown>[]
    | undefined

  const isLoading = dialogOpen && entity !== null && data === undefined
  const recordCount = data?.length ?? 0

  const toggleColumn = useCallback((columnId: string) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (!entity) return
    const allIds = EXPORT_COLUMN_MAP[entity]
      .filter((c) => !c.required)
      .map((c) => c.id)
    setSelectedColumns((prev) => {
      const allSelected = allIds.every((id) => prev.has(id))
      const next = new Set(prev)
      for (const id of allIds) {
        if (allSelected) {
          next.delete(id)
        } else {
          next.add(id)
        }
      }
      return next
    })
  }, [entity])

  const initForEntity = useCallback(
    (
      newEntity: ExportEntity,
      defaultStartMs?: number,
      defaultEndMs?: number
    ) => {
      const cols = new Set(EXPORT_COLUMN_MAP[newEntity].map((c) => c.id))
      setSelectedColumns(cols)

      if (defaultStartMs && defaultStartMs > 0) {
        setStartDate(new Date(defaultStartMs))
      } else {
        setStartDate(undefined)
      }
      if (defaultEndMs && defaultEndMs < Infinity) {
        setEndDate(new Date(defaultEndMs))
      } else {
        setEndDate(undefined)
      }
      setStartTime("00:00")
      setEndTime("23:59")
    },
    []
  )

  const applyQuickRange = useCallback((preset: QuickRange) => {
    if (preset === "all") {
      setStartDate(undefined)
      setEndDate(undefined)
    } else {
      const { startMs, endMs } = computeQuickRange(preset)
      setStartDate(new Date(startMs))
      setEndDate(new Date(endMs))
    }
    setStartTime("00:00")
    setEndTime("23:59")
  }, [])

  const download = useCallback(() => {
    if (!data || !entity) return

    const columns = EXPORT_COLUMN_MAP[entity]
    const activeColumns = columns.filter((c) => selectedColumns.has(c.id))
    const headers = activeColumns.map((c) => c.label)

    const rows: Array<Array<string | number | null | undefined>> = data.map(
      (row) =>
        activeColumns.map((c) => {
          const val = row[c.id]
          if (c.id === "date" || c.id === "createdAt") {
            return typeof val === "number"
              ? formatTimestamp(val)
              : String(val ?? "")
          }
          return val as string | number | null | undefined
        })
    )

    const csvContent = formatCsv(headers, rows)
    const today = new Date().toISOString().slice(0, 10)
    downloadCsv(csvContent, `${entity}-${today}.csv`)
    setDialogOpen(false)
    sileo.success({
      title: `${EXPORT_ENTITY_NAMES[entity]} exported`,
      description: `${recordCount} record${recordCount === 1 ? "" : "s"} downloaded as CSV`,
    })
  }, [data, entity, selectedColumns, recordCount])

  const summaryLines: string[] = []
  if (needsDateFilter) {
    summaryLines.push(
      `Date range: ${startDate ? formatTimestamp(startMs) : "earliest"} – ${endDate ? formatTimestamp(endMs) : "latest"}`
    )
  }
  summaryLines.push(
    `Entity: ${entity ? EXPORT_COLUMN_MAP[entity].length : 0} columns available`
  )

  return {
    dialogOpen,
    setDialogOpen,
    isLoading,
    selectedColumns,
    toggleColumn,
    toggleAll,
    recordCount,
    summaryLines,
    download,
    needsDateFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    startMs,
    endMs,
    initForEntity,
    applyQuickRange,
  }
}
