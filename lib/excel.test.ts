// @vitest-environment node

import ExcelJS from "exceljs"
import { describe, expect, it } from "vitest"
import { buildDispatchWorkbook } from "./excel"

// Guards the Excel repair regression: the Table's built-in totals row used to
// emit structured SUBTOTAL refs that desynced xl/tables/table*.xml from the
// cells, so Excel repaired both tables with a circular-reference warning.
// Totals are plain SUM rows below each table now — this pins that no formula
// in the file can reference its own row.
function allFormulas(
  wb: ExcelJS.Workbook
): Array<{ address: string; formula: string }> {
  const out: Array<{ address: string; formula: string }> = []
  for (const ws of wb.worksheets) {
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        const value = cell.value
        if (value !== null && typeof value === "object" && "formula" in value) {
          out.push({
            address: `${ws.name}!${cell.address}`,
            formula: String((value as { formula: unknown }).formula),
          })
        }
      })
    })
  }
  return out
}

const baseData = {
  dispatches: [
    {
      _id: "d1",
      date: Date.now(),
      status: "completed",
      orNumber: "OR-1",
      customerRef: "Acme",
      dispatchedBy: "Ann",
      itemCount: 2,
      totalQuantity: 30,
      totalValue: 450,
    },
    {
      _id: "d2",
      date: Date.now(),
      status: "completed",
      orNumber: "OR-2",
      customerRef: "",
      dispatchedBy: "",
      itemCount: 1,
      totalQuantity: 5,
      totalValue: 75,
    },
  ],
  items: [
    {
      dispatchId: "d1",
      date: Date.now(),
      orNumber: "OR-1",
      customerRef: "Acme",
      dispatchedBy: "Ann",
      product: "Sack",
      batchCode: "B-1",
      dispatchUom: "piece",
      dispatchQty: 30,
      qtyDeducted: 30,
      unitCost: 15,
      lineTotal: 450,
    },
  ],
  truncated: false,
  limit: 1000,
  rangeLabel: "Oct 1 – Oct 31",
  generatedAt: Date.now(),
}

describe("buildDispatchWorkbook", () => {
  it("uses self-contained SUM totals with no SUBTOTAL structured refs", async () => {
    const wb = buildDispatchWorkbook(baseData)
    const buf = await wb.xlsx.writeBuffer()

    const reloaded = new ExcelJS.Workbook()
    await reloaded.xlsx.load(buf)

    // Both Tables survive the round trip.
    expect(
      reloaded.getWorksheet("Dispatches")?.getTable("Dispatches")
    ).toBeDefined()
    expect(
      reloaded.getWorksheet("Items")?.getTable("DispatchItems")
    ).toBeDefined()

    const formulas = allFormulas(reloaded)
    expect(formulas.length).toBeGreaterThan(0)
    for (const { address, formula } of formulas) {
      // Structured refs (`Table[Column]`) resolve against the table range, so
      // a totals formula written through them is what Excel flagged.
      expect(`${address}: ${formula}`).not.toContain("SUBTOTAL")
      expect(`${address}: ${formula}`).not.toContain("[")
    }

    // The SUM ranges cover only data rows, never the totals row itself.
    const dws = reloaded.getWorksheet("Dispatches")
    expect(dws?.getCell("E8").value).toEqual({ formula: "SUM(E6:E7)" })
    expect(dws?.getCell("F8").value).toEqual({ formula: "SUM(F6:F7)" })
    expect(dws?.getCell("G8").value).toEqual({ formula: "SUM(G6:G7)" })
  })

  it("emits no formulas for an empty export", async () => {
    const wb = buildDispatchWorkbook({ ...baseData, dispatches: [], items: [] })
    const buf = await wb.xlsx.writeBuffer()

    const reloaded = new ExcelJS.Workbook()
    await reloaded.xlsx.load(buf)
    expect(allFormulas(reloaded)).toHaveLength(0)
  })
})
