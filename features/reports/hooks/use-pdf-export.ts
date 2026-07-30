"use client"

import type { FunctionReturnType } from "convex/server"
import { useQueries } from "convex-helpers/react/cache"
import { useCallback, useState } from "react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import { downloadPdf } from "@/lib/csv"
import { setCachedPrimitives } from "../components/export/report/pdf-primitives"
import { computeQuickRange, type QuickRange } from "../constants"

type MonthlyReportData = Awaited<
  FunctionReturnType<typeof api.reports.queries.exportMonthlyReport>
>

export function usePdfExport() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState("00:00")
  const [endTime, setEndTime] = useState("23:59")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const startMs = (() => {
    if (!startDate) return 0
    const [h, m] = startTime.split(":").map(Number)
    const d = new Date(startDate)
    d.setHours(h, m, 0, 0)
    return d.getTime()
  })()

  const endMs = (() => {
    if (!endDate) return Date.now() + 24 * 60 * 60 * 1000
    const [h, m] = endTime.split(":").map(Number)
    const d = new Date(endDate)
    d.setHours(h, m, 59, 999)
    return d.getTime()
  })()

  const result = useQueries(
    dialogOpen
      ? {
          _default: {
            query: api.reports.queries.exportMonthlyReport,
            args: { startMs, endMs },
          },
        }
      : {}
  )._default

  const queryFailed = result instanceof Error
  const data = queryFailed
    ? undefined
    : (result as MonthlyReportData | undefined)
  const queryError = queryFailed ? (result as Error).message : null
  const error = queryError ?? generateError

  const initForEntity = useCallback(
    (defaultStartMs?: number, defaultEndMs?: number) => {
      setGenerateError(null)
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
    setGenerateError(null)
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

  const isLoading = dialogOpen && data === undefined && !queryFailed
  const hasData = Boolean(data)
  const isEmpty = data
    ? data.dispatchCount === 0 && data.adjustmentCount === 0
    : false

  const generate = useCallback(async () => {
    if (queryFailed) {
      setGenerateError("Report data failed to load. Please try again.")
      return
    }
    if (isLoading || !data) {
      setGenerateError(
        "Report data is still loading. Please wait and try again."
      )
      return
    }
    setGenerateError(null)
    setIsGenerating(true)

    try {
      const pdfModule = await import("@react-pdf/renderer")
      const { MonthlyReport } = await import(
        "../components/export/report/monthly-report"
      )

      setCachedPrimitives({
        Page: pdfModule.Page,
        Text: pdfModule.Text,
        View: pdfModule.View,
        StyleSheet: pdfModule.StyleSheet,
        Document: pdfModule.Document,
      })

      const blob = await pdfModule
        .pdf(
          MonthlyReport({
            data,
            startDate: new Date(startMs),
            endDate: new Date(endMs),
          })
        )
        .toBlob()

      setCachedPrimitives(null)

      const now = new Date()
      const filename = `monthly-report-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.pdf`
      downloadPdf(blob, filename)
      setDialogOpen(false)
      sileo.success({ title: "Monthly report downloaded" })
    } catch (err) {
      console.error("PDF generation failed:", err)
      setGenerateError("PDF generation failed. Please try again.")
      sileo.error({ title: "PDF generation failed" })
      setCachedPrimitives(null)
    } finally {
      setIsGenerating(false)
    }
  }, [data, startMs, endMs, isLoading, queryFailed])

  const summaryLines: string[] = []
  if (startDate) {
    summaryLines.push(
      `From: ${new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(new Date(startMs))} ${startTime}`
    )
  }
  if (endDate) {
    summaryLines.push(
      `To: ${new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(new Date(endMs))} ${endTime}`
    )
  }
  if (data) {
    summaryLines.push(
      `Dispatches: ${data.dispatchCount}, Adjustments: ${data.adjustmentCount}, Items Out: ${data.totalItems}`
    )
  }

  return {
    dialogOpen,
    setDialogOpen,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    isGenerating,
    isLoading,
    queryFailed,
    hasData,
    isEmpty,
    error,
    summaryLines,
    generate,
    initForEntity,
    applyQuickRange,
  }
}
