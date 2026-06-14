import { useMemo } from "react"
import { usePdfPrimitives } from "./pdf-primitives"

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function formatDate(ms: number): string {
  return dateFormatter.format(new Date(ms))
}

const styles = {
  colDate: { width: "18%" },
  colProduct: { width: "18%" },
  colBatch: { width: "14%" },
  colUom: { width: "10%" },
  colQty: { width: "10%" },
  colDeducted: { width: "10%" },
  colCost: { width: "10%" },
  colTotal: { width: "10%" },
  colCustomer: { width: "20%" },
  colUser: { width: "18%" },
  colStatus: { width: "12%" },
}

type DataAppendixProps = {
  dispatches: Array<{
    dispatchDate: number
    productName: string
    batchCode: string
    dispatchUom: string
    dispatchQty: number
    qtyDeducted: number
    unitCost: number
    lineTotal: number
    customerRef: string
    dispatchedBy: string
    dispatchStatus: string
  }>
  adjustments: Array<{
    date: number
    product: string
    batchCode: string
    reason: string
    quantityAdjusted: number
    adjustedBy: string
    status: string
  }>
}

export function DataAppendix({ dispatches, adjustments }: DataAppendixProps) {
  const { Page, StyleSheet, Text, View } = usePdfPrimitives()

  const pdfStyles = useMemo(
    () =>
      StyleSheet.create({
        page: {
          flexDirection: "column",
          backgroundColor: "#ffffff",
          padding: 40,
        },
        sectionTitle: {
          fontSize: 14,
          fontFamily: "Helvetica-Bold",
          color: "#1a1a2e",
          marginBottom: 8,
          marginTop: 20,
        },
        table: {
          width: "100%",
          marginBottom: 12,
        },
        headerRow: {
          flexDirection: "row",
          backgroundColor: "#f3f4f6",
          borderRadius: 3,
          paddingVertical: 5,
          paddingHorizontal: 4,
          marginBottom: 2,
        },
        headerCell: {
          fontSize: 8,
          fontFamily: "Helvetica-Bold",
          color: "#374151",
        },
        row: {
          flexDirection: "row",
          paddingVertical: 4,
          paddingHorizontal: 4,
          borderBottomWidth: 0.5,
          borderBottomColor: "#f3f4f6",
          borderBottomStyle: "solid",
        },
        rowAlt: {
          flexDirection: "row",
          paddingVertical: 4,
          paddingHorizontal: 4,
          backgroundColor: "#fafafa",
          borderBottomWidth: 0.5,
          borderBottomColor: "#f3f4f6",
          borderBottomStyle: "solid",
        },
        cell: {
          fontSize: 8,
          fontFamily: "Helvetica",
          color: "#4b5563",
        },
        noData: {
          fontSize: 10,
          fontFamily: "Helvetica",
          color: "#6b7280",
          marginBottom: 16,
        },
      }),
    [StyleSheet]
  )

  return (
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.sectionTitle}>Appendix: Dispatches</Text>

      {dispatches.length === 0 ? (
        <Text style={pdfStyles.noData}>
          No dispatch data for the selected period.
        </Text>
      ) : (
        <View style={pdfStyles.table}>
          <View style={pdfStyles.headerRow}>
            <Text style={[pdfStyles.headerCell, styles.colDate]}>Date</Text>
            <Text style={[pdfStyles.headerCell, styles.colProduct]}>
              Product
            </Text>
            <Text style={[pdfStyles.headerCell, styles.colBatch]}>Batch</Text>
            <Text style={[pdfStyles.headerCell, styles.colUom]}>UoM</Text>
            <Text style={[pdfStyles.headerCell, styles.colQty]}>Qty</Text>
            <Text style={[pdfStyles.headerCell, styles.colDeducted]}>
              Deducted
            </Text>
            <Text style={[pdfStyles.headerCell, styles.colCost]}>Cost</Text>
            <Text style={[pdfStyles.headerCell, styles.colTotal]}>Total</Text>
          </View>
          {dispatches.map((d, i) => (
            <View
              key={`${d.dispatchDate}-${d.batchCode}`}
              style={i % 2 === 0 ? pdfStyles.row : pdfStyles.rowAlt}
            >
              <Text style={[pdfStyles.cell, styles.colDate]}>
                {formatDate(d.dispatchDate)}
              </Text>
              <Text style={[pdfStyles.cell, styles.colProduct]}>
                {d.productName}
              </Text>
              <Text style={[pdfStyles.cell, styles.colBatch]}>
                {d.batchCode}
              </Text>
              <Text style={[pdfStyles.cell, styles.colUom]}>
                {d.dispatchUom}
              </Text>
              <Text style={[pdfStyles.cell, styles.colQty]}>
                {d.dispatchQty}
              </Text>
              <Text style={[pdfStyles.cell, styles.colDeducted]}>
                {d.qtyDeducted}
              </Text>
              <Text style={[pdfStyles.cell, styles.colCost]}>
                {d.unitCost.toFixed(2)}
              </Text>
              <Text style={[pdfStyles.cell, styles.colTotal]}>
                {d.lineTotal.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={[pdfStyles.sectionTitle, { marginTop: 32 }]}>
        Appendix: Stock Adjustments
      </Text>

      {adjustments.length === 0 ? (
        <Text style={pdfStyles.noData}>
          No adjustments for the selected period.
        </Text>
      ) : (
        <View style={pdfStyles.table} wrap={false}>
          <View style={pdfStyles.headerRow}>
            <Text style={[pdfStyles.headerCell, styles.colDate]}>Date</Text>
            <Text style={[pdfStyles.headerCell, styles.colProduct]}>
              Product
            </Text>
            <Text style={[pdfStyles.headerCell, styles.colBatch]}>Batch</Text>
            <Text style={[pdfStyles.headerCell, styles.colQty]}>Qty</Text>
            <Text style={[pdfStyles.headerCell, styles.colUser]}>Reason</Text>
            <Text style={[pdfStyles.headerCell, styles.colUser]}>By</Text>
            <Text style={[pdfStyles.headerCell, styles.colStatus]}>Status</Text>
          </View>
          {adjustments.map((a, i) => (
            <View
              key={`${a.date}-${a.batchCode}-${a.reason}`}
              style={i % 2 === 0 ? pdfStyles.row : pdfStyles.rowAlt}
            >
              <Text style={[pdfStyles.cell, styles.colDate]}>
                {formatDate(a.date)}
              </Text>
              <Text style={[pdfStyles.cell, styles.colProduct]}>
                {a.product}
              </Text>
              <Text style={[pdfStyles.cell, styles.colBatch]}>
                {a.batchCode}
              </Text>
              <Text style={[pdfStyles.cell, styles.colQty]}>
                {a.quantityAdjusted}
              </Text>
              <Text style={[pdfStyles.cell, styles.colUser]}>{a.reason}</Text>
              <Text style={[pdfStyles.cell, styles.colUser]}>
                {a.adjustedBy}
              </Text>
              <Text style={[pdfStyles.cell, styles.colStatus]}>{a.status}</Text>
            </View>
          ))}
        </View>
      )}
    </Page>
  )
}
