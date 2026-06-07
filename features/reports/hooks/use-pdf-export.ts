"use client"

import type { FunctionReturnType } from "convex/server"
import { useQuery } from "convex-helpers/react/cache"
import { useCallback, useState } from "react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import { downloadPdf } from "@/lib/csv"
import { setCachedPrimitives } from "../components/export/report/pdf-primitives"
import { computeQuickRange, type QuickRange } from "../constants"

export function usePdfExport() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState("00:00")
  const [endTime, setEndTime] = useState("23:59")
  const [isGenerating, setIsGenerating] = useState(false)

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

  const data = useQuery(
    api.reports.queries.exportMonthlyReport,
    dialogOpen ? { startMs, endMs } : "skip"
  ) as
    | Awaited<
        FunctionReturnType<typeof api.reports.queries.exportMonthlyReport>
      >
    | undefined

  const initForEntity = useCallback(
    (defaultStartMs?: number, defaultEndMs?: number) => {
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

  const generate = useCallback(async () => {
    if (!data) return
    setIsGenerating(true)

    try {
      const pdfModule = await import("@react-pdf/renderer")
      const { MonthlyReport } = await import("../components/export/report/monthly-report")

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
      sileo.error({ title: "PDF generation failed" })
      setCachedPrimitives(null)
    } finally {
      setIsGenerating(false)
    }
  }, [data, startMs, endMs])

  const isLoading = dialogOpen && data === undefined
  const hasData = Boolean(data)
  const isEmpty = data
    ? data.dispatchCount === 0 && data.adjustmentCount === 0
    : false

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
    hasData,
    isEmpty,
    summaryLines,
    generate,
    initForEntity,
    applyQuickRange,
  }
}
