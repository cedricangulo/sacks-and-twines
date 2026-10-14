import { useMemo } from "react"
import { usePdfPrimitives } from "./pdf-primitives"

// Brand palette (mirrors `app/globals.css` light theme).
const NAVY = "#14369c"
const PALE = "#eff6ff"
const ZEBRA = "#f4f6fd"
const INK = "#1a1a2e"
const MUTED = "#6b7280"
const WARNING_BG = "#fef3c7"
const WARNING_TEXT = "#92400e"

/** Hoisted — reused for every date cell; explicit `Asia/Manila` for SSR/CSR consistency. */
const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Manila",
})

function formatDate(ms: number): string {
  return dateFormatter.format(new Date(ms))
}

/** Hoisted — grouped thousands (`487,826.23`), matching the app's ₱ displays. */
const PESO_NUM = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// `₱` needs the embedded Nunito Sans (Helvetica substitutes `±`); the Helvetica
// fallback prints an unambiguous `PHP ` prefix instead.
function formatPeso(value: number, useEmbeddedFont: boolean): string {
  return `${useEmbeddedFont ? "₱" : "PHP "}${PESO_NUM.format(value)}`
}

export interface PdfDispatchRow {
  _id: string
  date: number
  orNumber: string
  customerRef: string
  dispatchedBy: string
  itemCount: number
  totalQuantity: number
  totalValue: number
}

export interface PdfDispatchItemRow {
  dispatchId: string
  product: string
  batchCode: string
  dispatchUom: string
  dispatchQty: number
  qtyDeducted: number
  unitCost: number
  lineTotal: number
}

interface DispatchReportProps {
  dispatches: PdfDispatchRow[]
  items: PdfDispatchItemRow[]
  rangeLabel: string
  generatedAt: number
  truncated: boolean
  limit: number
  useEmbeddedFont: boolean
}

// Branded dispatch report: navy cover header, KPI band, one compact group per
// dispatch (identity left, total right) followed by its items sub-table.
// Stays printable for whole-month ranges where a full section per dispatch
// would explode the page count.
//
// Type runs in embedded Nunito Sans (the app font) when available so ₱ prints
// correctly; the Helvetica fallback (WinAnsi, no ₱ glyph) uses a `PHP ` prefix
// instead.
export function DispatchReport({
  dispatches,
  items,
  rangeLabel,
  generatedAt,
  truncated,
  limit,
  useEmbeddedFont,
}: DispatchReportProps) {
  const { Document, Page, StyleSheet, Text, View } = usePdfPrimitives()

  // Embedded Nunito Sans resolves bold via weight; Helvetica needs the
  // `-Bold` face.
  const bodyFamily = useEmbeddedFont ? "Report" : "Helvetica"
  const boldFamily = useEmbeddedFont ? "Report" : "Helvetica-Bold"
  const boldWeight = useMemo(
    () => (useEmbeddedFont ? { fontWeight: 700 as const } : null),
    [useEmbeddedFont]
  )
  const pesoMark = useEmbeddedFont ? "₱" : "PHP"

  const itemsByDispatch = useMemo(() => {
    const map = new Map<string, PdfDispatchItemRow[]>()
    for (const item of items) {
      const list = map.get(item.dispatchId)
      if (list) list.push(item)
      else map.set(item.dispatchId, [item])
    }
    return map
  }, [items])

  const totalValue = useMemo(
    () => dispatches.reduce((sum, d) => sum + d.totalValue, 0),
    [dispatches]
  )

  const pdfStyles = useMemo(
    () =>
      StyleSheet.create({
        page: {
          flexDirection: "column",
          backgroundColor: "#ffffff",
          padding: 40,
          paddingBottom: 56,
        },
        cover: {
          backgroundColor: NAVY,
          borderRadius: 6,
          paddingVertical: 14,
          paddingHorizontal: 16,
          marginBottom: 12,
        },
        eyebrow: {
          fontSize: 8,
          fontFamily: boldFamily,
          ...boldWeight,
          color: "#bfdbfe",
          letterSpacing: 2,
          marginBottom: 4,
        },
        title: {
          fontSize: 20,
          fontFamily: boldFamily,
          ...boldWeight,
          color: "#ffffff",
          marginBottom: 4,
        },
        coverSub: {
          fontSize: 10,
          fontFamily: bodyFamily,
          color: "#dbeafe",
        },
        warning: {
          fontSize: 9,
          fontFamily: boldFamily,
          ...boldWeight,
          color: WARNING_TEXT,
          backgroundColor: WARNING_BG,
          borderRadius: 4,
          paddingVertical: 6,
          paddingHorizontal: 8,
          marginBottom: 10,
        },
        kpiRow: {
          flexDirection: "row",
          gap: 8,
          marginBottom: 6,
        },
        kpiCard: {
          flex: 1,
          backgroundColor: PALE,
          borderRadius: 4,
          paddingVertical: 8,
          paddingHorizontal: 10,
        },
        kpiLabel: {
          fontSize: 8,
          fontFamily: boldFamily,
          ...boldWeight,
          color: MUTED,
          letterSpacing: 1,
          marginBottom: 2,
        },
        kpiValue: {
          fontSize: 14,
          fontFamily: boldFamily,
          ...boldWeight,
          color: NAVY,
        },
        groupHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: PALE,
          borderRadius: 3,
          paddingVertical: 5,
          paddingHorizontal: 8,
          marginTop: 10,
          marginBottom: 2,
        },
        groupIdentity: {
          fontSize: 9,
          fontFamily: bodyFamily,
          color: INK,
        },
        groupOr: {
          fontFamily: boldFamily,
          ...boldWeight,
          color: NAVY,
        },
        groupTotal: {
          fontSize: 9,
          fontFamily: boldFamily,
          ...boldWeight,
          color: NAVY,
        },
        table: {
          width: "100%",
        },
        headerRow: {
          flexDirection: "row",
          backgroundColor: NAVY,
          borderRadius: 3,
          paddingVertical: 5,
          paddingHorizontal: 6,
          marginBottom: 2,
        },
        headerCell: {
          fontSize: 8,
          fontFamily: boldFamily,
          ...boldWeight,
          color: "#ffffff",
        },
        row: {
          flexDirection: "row",
          paddingVertical: 4,
          paddingHorizontal: 6,
          borderBottomWidth: 0.5,
          borderBottomColor: "#e5e7eb",
          borderBottomStyle: "solid",
        },
        rowAlt: {
          flexDirection: "row",
          paddingVertical: 4,
          paddingHorizontal: 6,
          backgroundColor: ZEBRA,
          borderBottomWidth: 0.5,
          borderBottomColor: "#e5e7eb",
          borderBottomStyle: "solid",
        },
        cell: {
          fontSize: 8,
          fontFamily: bodyFamily,
          color: "#4b5563",
        },
        numCell: {
          fontSize: 8,
          fontFamily: bodyFamily,
          color: "#4b5563",
          textAlign: "right",
        },
        footer: {
          position: "absolute",
          bottom: 24,
          left: 40,
          right: 40,
          flexDirection: "row",
          justifyContent: "space-between",
        },
        footerText: {
          fontSize: 8,
          fontFamily: bodyFamily,
          color: "#9ca3af",
        },
      }),
    [StyleSheet, bodyFamily, boldFamily, boldWeight]
  )

  const col = {
    product: { width: "30%" },
    batch: { width: "20%" },
    uom: { width: "10%" },
    qty: { width: "13%", textAlign: "right" as const },
    cost: { width: "13%", textAlign: "right" as const },
    total: { width: "14%", textAlign: "right" as const },
  }

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.cover}>
          <Text style={pdfStyles.eyebrow}>SACKS & TWINES</Text>
          <Text style={pdfStyles.title}>Dispatch Report</Text>
          <Text style={pdfStyles.coverSub}>
            {rangeLabel} · Generated {formatDate(generatedAt)}
          </Text>
        </View>

        {truncated ? (
          <Text style={pdfStyles.warning}>
            Limited to the first {dispatches.length} of more than {limit}{" "}
            matching dispatches — narrow the date range for a complete report.
          </Text>
        ) : null}

        <View style={pdfStyles.kpiRow}>
          <View style={pdfStyles.kpiCard}>
            <Text style={pdfStyles.kpiLabel}>DISPATCHES</Text>
            <Text style={pdfStyles.kpiValue}>{dispatches.length}</Text>
          </View>
          <View style={pdfStyles.kpiCard}>
            <Text style={pdfStyles.kpiLabel}>ITEMS OUT</Text>
            <Text style={pdfStyles.kpiValue}>{items.length}</Text>
          </View>
          <View style={pdfStyles.kpiCard}>
            <Text style={pdfStyles.kpiLabel}>TOTAL VALUE</Text>
            <Text style={pdfStyles.kpiValue}>
              {formatPeso(totalValue, useEmbeddedFont)}
            </Text>
          </View>
        </View>

        {dispatches.map((d) => (
          <View key={d._id}>
            {/* The header stays on one page; the items table below may break
            across pages so an item-heavy dispatch never overflows off the
            page bottom (`wrap={false}` on the whole group would clip it). */}
            <View style={pdfStyles.groupHeader} wrap={false}>
              <Text style={pdfStyles.groupIdentity}>
                <Text style={pdfStyles.groupOr}>{d.orNumber || "-"}</Text>
                {"  ·  "}
                {formatDate(d.date)} · {d.customerRef || "No ref"} ·{" "}
                {d.dispatchedBy || "-"} · {d.itemCount} items
              </Text>
              <Text style={pdfStyles.groupTotal}>
                {formatPeso(d.totalValue, useEmbeddedFont)}
              </Text>
            </View>
            <View style={pdfStyles.table}>
              <View style={pdfStyles.headerRow}>
                <Text style={[pdfStyles.headerCell, col.product]}>Product</Text>
                <Text style={[pdfStyles.headerCell, col.batch]}>Batch</Text>
                <Text style={[pdfStyles.headerCell, col.uom]}>UoM</Text>
                <Text style={[pdfStyles.headerCell, col.qty]}>Qty</Text>
                <Text style={[pdfStyles.headerCell, col.cost]}>
                  Cost ({pesoMark})
                </Text>
                <Text style={[pdfStyles.headerCell, col.total]}>
                  Total ({pesoMark})
                </Text>
              </View>
              {(itemsByDispatch.get(d._id) ?? []).map((item, i) => (
                <View
                  key={`${d._id}-${item.batchCode}-${i}`}
                  style={i % 2 === 0 ? pdfStyles.row : pdfStyles.rowAlt}
                >
                  <Text style={[pdfStyles.cell, col.product]}>
                    {item.product || "-"}
                  </Text>
                  <Text style={[pdfStyles.cell, col.batch]}>
                    {item.batchCode || "-"}
                  </Text>
                  <Text style={[pdfStyles.cell, col.uom]}>
                    {item.dispatchUom}
                  </Text>
                  <Text style={[pdfStyles.numCell, col.qty]}>
                    {item.dispatchQty}
                  </Text>
                  <Text style={[pdfStyles.numCell, col.cost]}>
                    {PESO_NUM.format(item.unitCost)}
                  </Text>
                  <Text style={[pdfStyles.numCell, col.total]}>
                    {PESO_NUM.format(item.lineTotal)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerText}>
            Sacks & Twines · Figures as of generation time
          </Text>
          <Text
            style={pdfStyles.footerText}
            render={({
              pageNumber,
              totalPages,
            }: {
              pageNumber: number
              totalPages: number
            }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
