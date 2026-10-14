import ExcelJS from "exceljs"

export interface DispatchExcelRow {
  _id: string
  date: number
  orNumber: string
  customerRef: string
  dispatchedBy: string
  itemCount: number
  totalQuantity: number
  totalValue: number
}

export interface DispatchItemExcelRow {
  dispatchId: string
  date: number
  orNumber: string
  customerRef: string
  dispatchedBy: string
  product: string
  batchCode: string
  dispatchUom: string
  dispatchQty: number
  qtyDeducted: number
  unitCost: number
  lineTotal: number
}

export interface DispatchExcelData {
  dispatches: DispatchExcelRow[]
  items: DispatchItemExcelRow[]
  truncated: boolean
  limit: number
  rangeLabel: string
  generatedAt: number
}

// ---------------------------------------------------------------------------
// Brand palette (mirrors `app/globals.css` light theme)
// ---------------------------------------------------------------------------

const NAVY = "FF14369C"
const ROYAL = "FF315DF2"
const WHITE = "FFFFFFFF"
const INK = "FF1A1A2E"
const MUTED = "FF6B7280"
const WARNING_FILL = "FFFEF3C7"
const WARNING_TEXT = "FF92400E"

const DATE_FMT = "mmm dd, yyyy h:mm AM/PM"
const MONEY_FMT = "₱#,##0.00"
const QTY_FMT = "#,##0"

/**
 * Defuses formula injection for Excel string cells: a value starting with
 * `=`, `+`, `-` or `@` is prefixed with `'` so spreadsheet apps render it as
 * text (OWASP CSV Injection). Mirrors `escapeCsv` in `lib/csv.ts`.
 */
function safeString(val: string): string {
  if (/^[=+\-@]/.test(val) || /^[=+\-@]/.test(val.trimStart())) return `'${val}`
  return val
}

function styleTitleBlock(
  ws: ExcelJS.Worksheet,
  title: string,
  rangeLabel: string,
  generatedAt: number,
  columnCount: number
): void {
  const lastCol = String.fromCharCode(64 + columnCount)
  ws.mergeCells(`A1:${lastCol}1`)
  const titleCell = ws.getCell("A1")
  titleCell.value = title
  titleCell.font = {
    name: "Nunito Sans",
    size: 14,
    bold: true,
    color: { argb: NAVY },
  }
  ws.getRow(1).height = 22

  ws.mergeCells(`A2:${lastCol}2`)
  const rangeCell = ws.getCell("A2")
  rangeCell.value = rangeLabel
  rangeCell.font = { name: "Nunito Sans", size: 10, color: { argb: MUTED } }

  ws.mergeCells(`A3:${lastCol}3`)
  const genCell = ws.getCell("A3")
  genCell.value = `Generated ${new Date(generatedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })} — figures reflect records as of generation time.`
  genCell.font = {
    name: "Nunito Sans",
    size: 9,
    italic: true,
    color: { argb: MUTED },
  }

  ws.getRow(4).height = 6
}

function paintTableHeader(
  ws: ExcelJS.Worksheet,
  headerRowNumber: number,
  columnCount: number
): void {
  const row = ws.getRow(headerRowNumber)
  row.height = 20
  for (let c = 1; c <= columnCount; c++) {
    const cell = row.getCell(c)
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }
    cell.font = {
      name: "Nunito Sans",
      size: 10,
      bold: true,
      color: { argb: WHITE },
    }
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    }
  }
}

function setupSheet(
  wb: ExcelJS.Workbook,
  name: string,
  tabColor: string,
  headerRowNumber: number
): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(name, {
    properties: { tabColor: { argb: tabColor } },
    views: [
      {
        state: "frozen",
        ySplit: headerRowNumber,
        topLeftCell: `A${headerRowNumber + 1}`,
        activeCell: "A1",
      },
    ],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: `${headerRowNumber}:${headerRowNumber}`,
    },
    headerFooter: { oddFooter: "Page &P of &N" },
  })
  ws.properties.defaultRowHeight = 15
  return ws
}

function writeHonestyFooter(
  ws: ExcelJS.Worksheet,
  startRow: number,
  columnCount: number,
  notes: string[],
  isWarning: boolean
): void {
  const lastCol = String.fromCharCode(64 + columnCount)
  let rowNumber = startRow
  for (const note of notes) {
    ws.mergeCells(`A${rowNumber}:${lastCol}${rowNumber}`)
    const cell = ws.getCell(`A${rowNumber}`)
    cell.value = note
    cell.font = {
      name: "Nunito Sans",
      size: 9,
      bold: isWarning,
      italic: !isWarning,
      color: { argb: isWarning ? WARNING_TEXT : MUTED },
    }
    if (isWarning) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: WARNING_FILL },
      }
      cell.alignment = { wrapText: true, vertical: "middle" }
      ws.getRow(rowNumber).height = 30
    }
    rowNumber += 1
  }
}

// Builds the two-sheet dispatches workbook: Sheet 1 holds one row per
// dispatch (header + totals), Sheet 2 holds one row per item linked by OR
// Number. Solves the multi-dispatch sub-table problem by keeping the join key
// in both sheets instead of nesting tables.
//
// Each data range is a real Excel Table (banded rows, filter buttons) with a
// navy brand header, frozen panes and print setup — readable on screen and on
// paper, not a plain grid.
//
// Totals are plain SUM rows written *below* each table, not the Table's
// built-in totals row: ExcelJS emits the built-in totals as structured
// SUBTOTAL refs, and post-hoc edits to that row desync xl/tables/table*.xml
// from the cells — Excel then repairs both tables with a circular-reference
// warning. A SUM over a concrete range below the table cannot include itself.
export function buildDispatchWorkbook(
  data: DispatchExcelData
): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Sacks & Twines"
  wb.created = new Date(data.generatedAt)

  // --- Sheet 1: Dispatches -------------------------------------------------
  const dws = setupSheet(wb, "Dispatches", NAVY, 5)
  styleTitleBlock(
    dws,
    "Sacks & Twines — Dispatch Report",
    data.rangeLabel,
    data.generatedAt,
    7
  )

  dws.addTable({
    name: "Dispatches",
    ref: "A5",
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium9", showRowStripes: true },
    columns: [
      { name: "Date", filterButton: true },
      { name: "OR Number", filterButton: true },
      { name: "Customer Ref", filterButton: true },
      { name: "Dispatched By", filterButton: true },
      { name: "Items", filterButton: false },
      { name: "Total Qty", filterButton: false },
      { name: "Total Value", filterButton: false },
    ],
    rows: data.dispatches.map((d) => [
      new Date(d.date),
      safeString(d.orNumber || "-"),
      safeString(d.customerRef || "-"),
      safeString(d.dispatchedBy || "-"),
      d.itemCount,
      d.totalQuantity,
      d.totalValue,
    ]),
  })
  paintTableHeader(dws, 5, 7)
  dws.getColumn(1).width = 20
  dws.getColumn(2).width = 16
  dws.getColumn(3).width = 20
  dws.getColumn(4).width = 18
  dws.getColumn(5).width = 9
  dws.getColumn(6).width = 11
  dws.getColumn(7).width = 15
  const dFirst = 6
  const dLast = 5 + data.dispatches.length
  for (let r = dFirst; r <= dLast; r++) {
    const row = dws.getRow(r)
    row.getCell(1).numFmt = DATE_FMT
    row.getCell(5).numFmt = QTY_FMT
    row.getCell(6).numFmt = QTY_FMT
    row.getCell(7).numFmt = MONEY_FMT
    for (let c = 5; c <= 7; c++)
      row.getCell(c).alignment = { horizontal: "right" }
  }
  if (data.dispatches.length > 0) {
    const totals = dws.getRow(dLast + 1)
    totals.getCell(1).value = "Totals:"
    totals.getCell(1).font = { bold: true, color: { argb: INK } }
    totals.getCell(5).value = { formula: `SUM(E${dFirst}:E${dLast})` }
    totals.getCell(5).numFmt = QTY_FMT
    totals.getCell(5).alignment = { horizontal: "right" }
    totals.getCell(6).value = { formula: `SUM(F${dFirst}:F${dLast})` }
    totals.getCell(6).numFmt = QTY_FMT
    totals.getCell(6).alignment = { horizontal: "right" }
    totals.getCell(7).value = { formula: `SUM(G${dFirst}:G${dLast})` }
    totals.getCell(7).numFmt = MONEY_FMT
    totals.getCell(7).alignment = { horizontal: "right" }
  }
  const dFooter = dLast + 3
  if (data.truncated) {
    writeHonestyFooter(
      dws,
      dFooter,
      7,
      [
        `TRUNCATED: first ${data.dispatches.length} of more than ${data.limit} matching dispatches. Narrow the date range or split the export.`,
      ],
      true
    )
  }

  // --- Sheet 2: Items ------------------------------------------------------
  const iws = setupSheet(wb, "Items", ROYAL, 5)
  styleTitleBlock(
    iws,
    "Dispatch Items — linked by OR Number",
    data.rangeLabel,
    data.generatedAt,
    9
  )

  iws.addTable({
    name: "DispatchItems",
    ref: "A5",
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium9", showRowStripes: true },
    columns: [
      { name: "OR Number", filterButton: true },
      { name: "Date", filterButton: true },
      { name: "Product", filterButton: true },
      { name: "Batch Code", filterButton: true },
      { name: "UoM", filterButton: false },
      { name: "Dispatch Qty", filterButton: false },
      { name: "Qty Deducted", filterButton: false },
      { name: "Unit Cost", filterButton: false },
      { name: "Line Total", filterButton: false },
    ],
    rows: data.items.map((i) => [
      safeString(i.orNumber || "-"),
      new Date(i.date),
      safeString(i.product || "-"),
      safeString(i.batchCode || "-"),
      i.dispatchUom,
      i.dispatchQty,
      i.qtyDeducted,
      i.unitCost,
      i.lineTotal,
    ]),
  })
  paintTableHeader(iws, 5, 9)
  iws.getColumn(1).width = 16
  iws.getColumn(2).width = 20
  iws.getColumn(3).width = 26
  iws.getColumn(4).width = 16
  iws.getColumn(5).width = 9
  iws.getColumn(6).width = 14
  iws.getColumn(7).width = 14
  iws.getColumn(8).width = 12
  iws.getColumn(9).width = 14
  const iFirst = 6
  const iLast = 5 + data.items.length
  for (let r = iFirst; r <= iLast; r++) {
    const row = iws.getRow(r)
    row.getCell(2).numFmt = DATE_FMT
    row.getCell(6).numFmt = QTY_FMT
    row.getCell(7).numFmt = QTY_FMT
    row.getCell(8).numFmt = MONEY_FMT
    row.getCell(9).numFmt = MONEY_FMT
    for (const c of [6, 7, 8, 9])
      row.getCell(c).alignment = { horizontal: "right" }
  }
  if (data.items.length > 0) {
    const totals = iws.getRow(iLast + 1)
    totals.getCell(1).value = "Totals:"
    totals.getCell(1).font = { bold: true, color: { argb: INK } }
    totals.getCell(6).value = { formula: `SUM(F${iFirst}:F${iLast})` }
    totals.getCell(6).numFmt = QTY_FMT
    totals.getCell(6).alignment = { horizontal: "right" }
    totals.getCell(7).value = { formula: `SUM(G${iFirst}:G${iLast})` }
    totals.getCell(7).numFmt = QTY_FMT
    totals.getCell(7).alignment = { horizontal: "right" }
    totals.getCell(9).value = { formula: `SUM(I${iFirst}:I${iLast})` }
    totals.getCell(9).numFmt = MONEY_FMT
    totals.getCell(9).alignment = { horizontal: "right" }
  }

  return wb
}

export async function downloadDispatchExcel(
  data: DispatchExcelData,
  filename: string
): Promise<void> {
  const wb = buildDispatchWorkbook(data)
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
