import { CategoryBreakdownChart } from "./category-breakdown-chart"
import { CoverPage } from "./cover-page"
import { DataAppendix } from "./data-appendix"
import { ExecutiveSummary } from "./executive-summary"
import { LowStockTable } from "./low-stock-table"
import { MonthlyTrendChart } from "./monthly-trend-chart"
import { usePdfPrimitives } from "./pdf-primitives"
import { ReasonBreakdownChart } from "./reason-breakdown-chart"

/** Hoisted — explicit `Asia/Manila` keeps server and client rendering identical. */
const monthFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Manila",
})

const generatedDateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Manila",
})

type MonthlyReportData = {
  dispatchCount: number
  adjustmentCount: number
  totalItems: number
  totalValue: number
  dispatchesPerDay: Record<string, number>
  categoryBreakdown: { sacks: number; twines: number }
  adjustmentsByReason: Record<string, number>
  lowStockProducts: Array<{
    name: string
    skuCode: string
    currentQuantity: number
    lowStockThreshold: number
  }>
  topProducts: Array<{
    name: string
    skuCode: string
    currentQuantity: number
  }>
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
  productCount: number
  supplierCount: number
}

type MonthlyReportProps = {
  data: MonthlyReportData
  startDate: Date
  endDate: Date
}

export function MonthlyReport({
  data,
  startDate,
  endDate,
}: MonthlyReportProps) {
  const { Document } = usePdfPrimitives()
  const monthLabel = monthFormatter.format(startDate)
  const generatedDate = generatedDateFormatter.format(new Date())

  return (
    <Document>
      <CoverPage monthLabel={monthLabel} generatedDate={generatedDate} />
      <ExecutiveSummary
        dispatchCount={data.dispatchCount}
        adjustmentCount={data.adjustmentCount}
        totalItems={data.totalItems}
        totalValue={data.totalValue}
      />
      <MonthlyTrendChart dispatchesPerDay={data.dispatchesPerDay} />
      <CategoryBreakdownChart categoryBreakdown={data.categoryBreakdown} />
      <ReasonBreakdownChart adjustmentsByReason={data.adjustmentsByReason} />
      <LowStockTable
        lowStockProducts={data.lowStockProducts}
        topProducts={data.topProducts}
      />
      <DataAppendix
        dispatches={data.dispatches}
        adjustments={data.adjustments}
      />
    </Document>
  )
}
