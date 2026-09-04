"use client"

import type { DocumentProps } from "@react-pdf/renderer"
import { useConvex } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import { play } from "cuelume"
import {
  createElement,
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import { downloadPdf } from "@/lib/csv"
import { setCachedPrimitives } from "../components/export/report/pdf-primitives"
import { computeQuickRange, type QuickRange } from "../constants"

/** Hoisted — reused for `From`/`To` summary lines. */
const PDF_DATE_FMT = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Manila",
})

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

  const convex = useConvex()
  const [data, setData] = useState<MonthlyReportData | undefined>(undefined)
  const [queryFailed, setQueryFailed] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)

  useEffect(() => {
    if (!dialogOpen) {
      setData(undefined)
      setQueryFailed(false)
      setQueryError(null)
      return
    }

    let cancelled = false
    setData(undefined)
    setQueryFailed(false)
    setQueryError(null)

    convex
      .query(api.reports.queries.exportMonthlyReport, { startMs, endMs })
      .then((res) => {
        if (!cancelled) setData(res as MonthlyReportData)
      })
      .catch((err) => {
        if (!cancelled) {
          setQueryFailed(true)
          setQueryError(err instanceof Error ? err.message : String(err))
        }
      })

    return () => {
      cancelled = true
    }
  }, [convex, dialogOpen, startMs, endMs])

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
    play("loading")

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
          createElement(MonthlyReport, {
            data,
            startDate: new Date(startMs),
            endDate: Number.isFinite(endMs) ? new Date(endMs) : new Date(),
          }) as ReactElement<DocumentProps>
        )
        .toBlob()

      setCachedPrimitives(null)

      const now = new Date()
      const filename = `monthly-report-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.pdf`
      downloadPdf(blob, filename)
      setDialogOpen(false)
      sileo.success({ title: "Monthly report downloaded" })
      play("success")
    } catch (err) {
      console.error("PDF generation failed:", err)
      setGenerateError("PDF generation failed. Please try again.")
      sileo.error({ title: "PDF generation failed" })
      play("error")
      setCachedPrimitives(null)
    } finally {
      setIsGenerating(false)
    }
  }, [data, startMs, endMs, isLoading, queryFailed])

  const summaryLines: string[] = []
  if (startDate) {
    summaryLines.push(
      `From: ${PDF_DATE_FMT.format(new Date(startMs))} ${startTime}`
    )
  }
  if (endDate) {
    summaryLines.push(`To: ${PDF_DATE_FMT.format(new Date(endMs))} ${endTime}`)
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
