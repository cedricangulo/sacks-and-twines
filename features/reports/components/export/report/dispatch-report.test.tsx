// @vitest-environment node

import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  Document,
  type DocumentProps,
  Font,
  Page,
  pdf,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"
import { createElement, type ReactElement } from "react"
import { describe, expect, it } from "vitest"
import { DispatchReport } from "./dispatch-report"
import { setCachedPrimitives } from "./pdf-primitives"

function toDataUrl(path: string): string {
  const bytes = readFileSync(path)
  let binary = ""
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return `data:font/ttf;base64,${btoa(binary)}`
}

// Guards the peso-sign regression: Helvetica (WinAnsi) has no ₱ (U+20B1) and
// the renderer substitutes `±`. The embedded Nunito Sans must carry the glyph
// into the PDF's ToUnicode map.
describe("DispatchReport peso rendering", () => {
  it("embeds the ₱ glyph instead of substituting ±", async () => {
    // The component uses the "Report" family, resolved here to Nunito Sans —
    // the same pairing `use-dispatch-export.ts` registers in the browser.
    Font.register({
      family: "Report",
      fonts: [
        {
          src: toDataUrl(
            join(process.cwd(), "public/fonts/NunitoSans-Regular.ttf")
          ),
          fontWeight: 400,
        },
        {
          src: toDataUrl(
            join(process.cwd(), "public/fonts/NunitoSans-Bold.ttf")
          ),
          fontWeight: 700,
        },
      ],
    })
    setCachedPrimitives({ Page, Text, View, StyleSheet, Document })

    const now = Date.now()
    const doc = createElement(DispatchReport, {
      dispatches: [
        {
          _id: "d1",
          date: now,
          orNumber: "OR-1",
          customerRef: "Acme",
          dispatchedBy: "Ann",
          itemCount: 1,
          totalQuantity: 30,
          totalValue: 487826.23,
        },
      ],
      items: [
        {
          dispatchId: "d1",
          product: "Sack",
          batchCode: "B-1",
          dispatchUom: "piece",
          dispatchQty: 30,
          qtyDeducted: 30,
          unitCost: 15,
          lineTotal: 450,
        },
      ],
      rangeLabel: "Oct 1 – Oct 31",
      generatedAt: now,
      truncated: false,
      limit: 1000,
      useEmbeddedFont: true,
    })

    // The component hardcodes the "Report" family; registered above.
    // Page content streams are Flate-compressed, so assertions target the
    // uncompressed ToUnicode CMaps: 20B1 proves ₱ survived, and no bare
    // 00B1 mapping means the old ± substitution is gone.
    const str = (
      await pdf(doc as ReactElement<DocumentProps>).toString()
    ).toLowerCase()
    expect(str).toContain("20b1")
    expect(str).not.toMatch(/<00b1>/)
    setCachedPrimitives(null)
  })
})
