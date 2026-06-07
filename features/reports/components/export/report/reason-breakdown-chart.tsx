import { useMemo } from "react"
import { usePdfPrimitives } from "./pdf-primitives"

const REASON_LABELS: Record<string, string> = {
  damaged: "Damaged",
  lost: "Lost",
  recount: "Recount",
  system_reversal: "System Reversal",
}

const REASON_COLORS: Record<string, string> = {
  damaged: "#ef4444",
  lost: "#f59e0b",
  recount: "#3b82f6",
  system_reversal: "#10b981",
}

type ReasonBreakdownChartProps = {
  adjustmentsByReason: Record<string, number>
}

export function ReasonBreakdownChart({
  adjustmentsByReason,
}: ReasonBreakdownChartProps) {
  const { Page, StyleSheet, Text, View } = usePdfPrimitives()
  const total = Object.values(adjustmentsByReason).reduce(
    (sum, v) => sum + v,
    0
  )
  const maxVal = Math.max(1, ...Object.values(adjustmentsByReason))

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
          width: 100,
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
      <Text style={styles.sectionTitle}>Stock Adjustments by Reason</Text>

      {total === 0 ? (
        <Text style={styles.noData}>
          No adjustments for the selected period.
        </Text>
      ) : (
        <View style={styles.barContainer}>
          {Object.entries(adjustmentsByReason).map(([reason, count]) => (
            <View key={reason} style={styles.barRow}>
              <Text style={styles.barLabel}>
                {REASON_LABELS[reason] ?? reason}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${(count / maxVal) * 100}%`,
                      backgroundColor: REASON_COLORS[reason] ?? "#6b7280",
                    },
                  ]}
                >
                  <Text style={styles.barValue}>{count}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </Page>
  )
}
