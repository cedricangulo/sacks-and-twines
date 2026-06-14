import { useMemo } from "react"
import { usePdfPrimitives } from "./pdf-primitives"

type LowStockTableProps = {
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
}

export function LowStockTable({
  lowStockProducts,
  topProducts,
}: LowStockTableProps) {
  const { Page, StyleSheet, Text, View } = usePdfPrimitives()

  const styles = useMemo(
    () =>
      StyleSheet.create({
        page: {
          flexDirection: "column",
          backgroundColor: "#ffffff",
          padding: 40,
        },
        sectionTitle: {
          fontSize: 18,
          fontFamily: "Helvetica-Bold",
          color: "#1a1a2e",
          marginBottom: 24,
        },
        table: {
          width: "100%",
        },
        headerRow: {
          flexDirection: "row",
          backgroundColor: "#f3f4f6",
          borderRadius: 4,
          paddingVertical: 8,
          paddingHorizontal: 8,
          marginBottom: 4,
        },
        headerCell: {
          fontSize: 10,
          fontFamily: "Helvetica-Bold",
          color: "#374151",
        },
        row: {
          flexDirection: "row",
          paddingVertical: 6,
          paddingHorizontal: 8,
          borderBottomWidth: 1,
          borderBottomColor: "#f3f4f6",
          borderBottomStyle: "solid",
        },
        cell: {
          fontSize: 10,
          fontFamily: "Helvetica",
          color: "#4b5563",
        },
        alertRow: {
          flexDirection: "row",
          paddingVertical: 6,
          paddingHorizontal: 8,
          backgroundColor: "#fef2f2",
          borderBottomWidth: 1,
          borderBottomColor: "#fecaca",
          borderBottomStyle: "solid",
        },
        noData: {
          fontSize: 12,
          fontFamily: "Helvetica",
          color: "#6b7280",
        },
        colSku: { width: "20%" },
        colName: { width: "35%" },
        colQty: { width: "20%" },
        colThreshold: { width: "25%" },
        subsectionTitle: {
          fontSize: 14,
          fontFamily: "Helvetica-Bold",
          color: "#1a1a2e",
          marginBottom: 12,
        },
        successMessage: {
          fontSize: 12,
          fontFamily: "Helvetica",
          color: "#10b981",
          marginBottom: 24,
        },
      }),
    [StyleSheet]
  )

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Inventory Health</Text>

      <Text style={styles.subsectionTitle}>Low Stock Alerts</Text>

      {lowStockProducts.length === 0 ? (
        <Text style={styles.successMessage}>
          All products are above their low stock thresholds.
        </Text>
      ) : (
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.colSku]}>SKU</Text>
            <Text style={[styles.headerCell, styles.colName]}>Product</Text>
            <Text style={[styles.headerCell, styles.colQty]}>Quantity</Text>
            <Text style={[styles.headerCell, styles.colThreshold]}>
              Threshold
            </Text>
          </View>
          {lowStockProducts.map((p) => (
            <View key={p.skuCode} style={styles.alertRow}>
              <Text style={[styles.cell, styles.colSku]}>{p.skuCode}</Text>
              <Text style={[styles.cell, styles.colName]}>{p.name}</Text>
              <Text style={[styles.cell, styles.colQty]}>
                {p.currentQuantity}
              </Text>
              <Text style={[styles.cell, styles.colThreshold]}>
                {p.lowStockThreshold}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.subsectionTitle, { marginTop: 32 }]}>
        Top 5 Products by Volume
      </Text>

      {topProducts.length === 0 ? (
        <Text style={styles.noData}>No active products found.</Text>
      ) : (
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.colSku]}>SKU</Text>
            <Text style={[styles.headerCell, styles.colName]}>Product</Text>
            <Text style={[styles.headerCell, styles.colQty]}>Quantity</Text>
            <Text style={[styles.headerCell, styles.colThreshold]}>Status</Text>
          </View>
          {topProducts.map((p) => (
            <View key={p.skuCode} style={styles.row}>
              <Text style={[styles.cell, styles.colSku]}>{p.skuCode}</Text>
              <Text style={[styles.cell, styles.colName]}>{p.name}</Text>
              <Text style={[styles.cell, styles.colQty]}>
                {p.currentQuantity}
              </Text>
              <Text style={[styles.cell, styles.colThreshold]}>Active</Text>
            </View>
          ))}
        </View>
      )}
    </Page>
  )
}
