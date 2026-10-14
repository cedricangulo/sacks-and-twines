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
import type { DateRange } from "react-day-picker"
import { sileo } from "sileo"
import { api } from "@/convex/_generated/api"
import { downloadPdf } from "@/lib/csv"
import { formatDate } from "@/lib/formatters/date"
import { setCachedPrimitives } from "../components/export/report/pdf-primitives"

export type DispatchExportFormat = "excel" | "pdf"
export type DispatchRangeMode = "day" | "week" | "month"

type DispatchReportData = Awaited<
  FunctionReturnType<typeof api.reports.queries.exportDispatchReport>
>

/** Warns before rendering when a grouped PDF gets this large. */
const LARGE_PDF_DISPATCHES = 200

/**
 * Family name for the embedded brand font in `public/fonts/`. The built-in
 * Helvetica is WinAnsi-encoded and has no ₱ (U+20B1), so peso amounts render
 * as `±` without this. Nunito Sans (the app font) carries the glyph.
 */
const REPORT_FONT_FAMILY = "Report"

// Module-level so repeat exports reuse the registered font instead of
// re-fetching ~1.2 MB of OTF on every download.
let reportFontPromise: Promise<boolean> | null = null

// Base64-encodes in chunks — one giant `String.fromCharCode(...bytes)` blows
// the call stack on a ~600 KB font file.
function arrayBufferToDataUrl(buffer: ArrayBuffer, mime: string): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return `data:${mime};base64,${btoa(binary)}`
}

async function ensureReportFont(
  pdfModule: typeof import("@react-pdf/renderer")
): Promise<boolean> {
  if (!reportFontPromise) {
    reportFontPromise = (async () => {
      try {
        const [regular, bold] = await Promise.all([
          fetch("/fonts/NunitoSans-Regular.ttf").then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            return r.arrayBuffer()
          }),
          fetch("/fonts/NunitoSans-Bold.ttf").then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            return r.arrayBuffer()
          }),
        ])
        // Data URLs: `FontSource` only accepts URL strings or base64
        // data URLs — raw buffers crash it (`dataUrl.substring`).
        pdfModule.Font.register({
          family: REPORT_FONT_FAMILY,
          fonts: [
            {
              src: arrayBufferToDataUrl(regular, "font/ttf"),
              fontWeight: 400,
            },
            { src: arrayBufferToDataUrl(bold, "font/ttf"), fontWeight: 700 },
          ],
        })
        return true
      } catch (err) {
        console.warn("Report font failed to load, using Helvetica:", err)
        return false
      }
    })()
  }
  return reportFontPromise
}

function startOfDay(d: Date): number {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c.getTime()
}

function endOfDay(d: Date): number {
  const c = new Date(d)
  c.setHours(23, 59, 59, 999)
  return c.getTime()
}

function resolveRange(
  mode: DispatchRangeMode,
  anchor: Date,
  custom: DateRange | undefined
): { startMs: number; endMs: number } {
  if (custom?.from) {
    return {
      startMs: startOfDay(custom.from),
      endMs: endOfDay(custom.to ?? custom.from),
    }
  }
  if (mode === "day") {
    return { startMs: startOfDay(anchor), endMs: endOfDay(anchor) }
  }
  if (mode === "week") {
    // Monday-start business week containing the anchor date.
    const day = (anchor.getDay() + 6) % 7
    const monday = new Date(anchor)
    monday.setDate(anchor.getDate() - day)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return { startMs: startOfDay(monday), endMs: endOfDay(sunday) }
  }
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  return { startMs: startOfDay(start), endMs: endOfDay(end) }
}

function formatShort(ms: number): string {
  return formatDate(ms, {
    year: "numeric",
    month: "short",
    day: "numeric",
    locale: "en-PH",
  })
}

export function useDispatchExport() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [format, setFormat] = useState<DispatchExportFormat>("excel")
  const [mode, setMode] = useState<DispatchRangeMode>("month")
  const [anchor, setAnchor] = useState<Date>(() => new Date())
  const [custom, setCustom] = useState<DateRange | undefined>(undefined)
  const [isWorking, setIsWorking] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { startMs, endMs } = useMemo(
    () => resolveRange(mode, anchor, custom),
    [mode, anchor, custom]
  )
  const rangeLabel = useMemo(
    () => `${formatShort(startMs)} – ${formatShort(endMs)}`,
    [startMs, endMs]
  )

  const convex = useConvex()
  const [data, setData] = useState<DispatchReportData | undefined>(undefined)
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
      .query(api.reports.queries.exportDispatchReport, { startMs, endMs })
      .then((res) => {
        if (!cancelled) setData(res as DispatchReportData)
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

  const isLoading = dialogOpen && data === undefined && !queryFailed
  const dispatchCount = data?.dispatches.length ?? 0
  const isEmpty = data ? dispatchCount === 0 : false
  const isLargePdf =
    format === "pdf" && !!data && dispatchCount > LARGE_PDF_DISPATCHES
  const error = queryError ?? actionError

  const init = useCallback((defaultStartMs?: number) => {
    setFormat("excel")
    setMode("month")
    setAnchor(defaultStartMs ? new Date(defaultStartMs) : new Date())
    setCustom(undefined)
    setActionError(null)
  }, [])

  const applyMode = useCallback((next: DispatchRangeMode) => {
    setMode(next)
    setCustom(undefined)
    setActionError(null)
  }, [])

  const fileStem = useMemo(() => {
    const stamp = (ms: number) => {
      const d = new Date(ms)
      const p = (n: number) => String(n).padStart(2, "0")
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    }
    return `dispatches-${stamp(startMs)}_to_${stamp(endMs)}`
  }, [startMs, endMs])

  const runExport = useCallback(async () => {
    if (queryFailed || isLoading || !data) {
      setActionError(
        queryFailed
          ? "Report data failed to load. Please try again."
          : "Report data is still loading. Please wait and try again."
      )
      return
    }
    setActionError(null)
    setIsWorking(true)
    play("loading")
    try {
      if (format === "excel") {
        const { downloadDispatchExcel } = await import("@/lib/excel")
        await downloadDispatchExcel(
          {
            dispatches: data.dispatches,
            items: data.items,
            truncated: data.truncated,
            limit: data.limit,
            rangeLabel,
            generatedAt: Date.now(),
          },
          `${fileStem}.xlsx`
        )
      } else {
        const pdfModule = await import("@react-pdf/renderer")
        const { DispatchReport } = await import(
          "../components/export/report/dispatch-report"
        )
        // Embedded Nunito Sans carries ₱; without it Helvetica substitutes `±`.
        const useEmbeddedFont = await ensureReportFont(pdfModule)
        setCachedPrimitives({
          Page: pdfModule.Page,
          Text: pdfModule.Text,
          View: pdfModule.View,
          StyleSheet: pdfModule.StyleSheet,
          Document: pdfModule.Document,
        })
        const blob = await pdfModule
          .pdf(
            createElement(DispatchReport, {
              dispatches: data.dispatches,
              items: data.items,
              rangeLabel,
              generatedAt: Date.now(),
              truncated: data.truncated,
              limit: data.limit,
              useEmbeddedFont,
            }) as ReactElement<DocumentProps>
          )
          .toBlob()
        setCachedPrimitives(null)
        downloadPdf(blob, `${fileStem}.pdf`)
      }
      setDialogOpen(false)
      sileo.success({
        title:
          format === "excel"
            ? "Dispatches exported to Excel"
            : "Dispatch report downloaded as PDF",
        description: `${dispatchCount} dispatch${dispatchCount === 1 ? "" : "es"} (${rangeLabel})`,
      })
      play("success")
    } catch (err) {
      console.error("Dispatch export failed:", err)
      setActionError(
        format === "excel"
          ? "Excel export failed. Please try again."
          : "PDF generation failed. Please try again."
      )
      sileo.error({ title: "Dispatch export failed" })
      play("error")
      setCachedPrimitives(null)
    } finally {
      setIsWorking(false)
    }
  }, [
    data,
    dispatchCount,
    fileStem,
    format,
    isLoading,
    queryFailed,
    rangeLabel,
  ])

  return {
    dialogOpen,
    setDialogOpen,
    format,
    setFormat,
    mode,
    applyMode,
    anchor,
    setAnchor,
    custom,
    setCustom,
    startMs,
    endMs,
    rangeLabel,
    isLoading,
    isWorking,
    queryFailed,
    isEmpty,
    isLargePdf,
    dispatchCount,
    truncated: data?.truncated ?? false,
    error,
    init,
    runExport,
  }
}
