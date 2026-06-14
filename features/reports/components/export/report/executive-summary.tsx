import { useMemo } from "react"
import { formatCurrency } from "@/lib/formatters"
import { usePdfPrimitives } from "./pdf-primitives"

type ExecutiveSummaryProps = {
  dispatchCount: number
  adjustmentCount: number
  totalItems: number
  totalValue: number
}

export function ExecutiveSummary({
  dispatchCount,
  adjustmentCount,
  totalItems,
  totalValue,
}: ExecutiveSummaryProps) {
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
          marginBottom: 20,
        },
        grid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
        },
        card: {
          width: "46%",
          backgroundColor: "#f9fafb",
          borderRadius: 8,
          padding: 16,
          marginBottom: 12,
        },
        cardValue: {
          fontSize: 24,
          fontFamily: "Helvetica-Bold",
          color: "#1a1a2e",
          marginBottom: 4,
        },
        cardLabel: {
          fontSize: 11,
          fontFamily: "Helvetica",
          color: "#6b7280",
        },
      }),
    [StyleSheet]
  )

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Executive Summary</Text>
      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{dispatchCount}</Text>
          <Text style={styles.cardLabel}>Total Dispatches</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{adjustmentCount}</Text>
          <Text style={styles.cardLabel}>Stock Adjustments</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{totalItems}</Text>
          <Text style={styles.cardLabel}>Items Dispatched</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>
            {formatCurrency(totalValue, {
              notation: "compact",
              maximumFractionDigits: 1,
            })}
          </Text>
          <Text style={styles.cardLabel}>Total Value</Text>
        </View>
      </View>
    </Page>
  )
}
