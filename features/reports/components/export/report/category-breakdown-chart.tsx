import { useMemo } from "react"
import { usePdfPrimitives } from "./pdf-primitives"

type CategoryBreakdownChartProps = {
  categoryBreakdown: {
    sacks: number
    twines: number
  }
}

export function CategoryBreakdownChart({
  categoryBreakdown,
}: CategoryBreakdownChartProps) {
  const { Page, StyleSheet, Text, View } = usePdfPrimitives()
  const { sacks, twines } = categoryBreakdown
  const total = sacks + twines
  const maxVal = Math.max(sacks, twines, 1)

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
        barContainer: {
          marginBottom: 20,
        },
        barRow: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 12,
        },
        barLabel: {
          width: 80,
          fontSize: 12,
          fontFamily: "Helvetica",
          color: "#374151",
        },
        barTrack: {
          flex: 1,
          height: 28,
          backgroundColor: "#f3f4f6",
          borderRadius: 4,
          overflow: "hidden",
        },
        barFill: {
          height: "100%",
          backgroundColor: "#3b82f6",
          borderRadius: 4,
          justifyContent: "center",
          paddingLeft: 8,
        },
        barValue: {
          fontSize: 10,
          fontFamily: "Helvetica-Bold",
          color: "#ffffff",
        },
        noData: {
          fontSize: 12,
          fontFamily: "Helvetica",
          color: "#6b7280",
        },
      }),
    [StyleSheet]
  )

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>
        Category Breakdown — Sacks vs Twines
      </Text>

      {total === 0 ? (
        <Text style={styles.noData}>
          No dispatch items for the selected period.
        </Text>
      ) : (
        <View style={styles.barContainer}>
          <View style={styles.barRow}>
            <Text style={styles.barLabel}>Sacks</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${(sacks / maxVal) * 100}%`,
                    backgroundColor: "#3b82f6",
                  },
                ]}
              >
                <Text style={styles.barValue}>{sacks}</Text>
              </View>
            </View>
          </View>
          <View style={styles.barRow}>
            <Text style={styles.barLabel}>Twines</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${(twines / maxVal) * 100}%`,
                    backgroundColor: "#f59e0b",
                  },
                ]}
              >
                <Text style={styles.barValue}>{twines}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </Page>
  )
}
