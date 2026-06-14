import { useMemo } from "react"
import { usePdfPrimitives } from "./pdf-primitives"

const CHART_WIDTH = 500
const CHART_HEIGHT = 250
const BAR_WIDTH = 12
const MAX_BAR_HEIGHT = 180
const MARGIN_LEFT = 50
const MARGIN_BOTTOM = 50
const MARGIN_TOP = 20

type MonthlyTrendChartProps = {
  dispatchesPerDay: Record<string, number>
}

export function MonthlyTrendChart({
  dispatchesPerDay,
}: MonthlyTrendChartProps) {
  const { Page, StyleSheet, Text, View } = usePdfPrimitives()
  const days = Object.keys(dispatchesPerDay).sort()
  const maxCount = Math.max(1, ...Object.values(dispatchesPerDay))
  const columns = days.length

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
        chartContainer: {
          width: CHART_WIDTH,
          height: CHART_HEIGHT,
          position: "relative",
        },
        bar: {
          position: "absolute",
          backgroundColor: "#3b82f6",
          borderRadius: 2,
        },
        label: {
          position: "absolute",
          fontSize: 11,
          fontFamily: "Helvetica",
          color: "#6b7280",
          textAlign: "center",
        },
        valueLabel: {
          position: "absolute",
          fontSize: 11,
          fontFamily: "Helvetica",
          color: "#374151",
          textAlign: "center",
        },
        axisLine: {
          position: "absolute",
          height: 1,
          backgroundColor: "#e5e7eb",
          left: MARGIN_LEFT,
          right: 0,
        },
        yLabel: {
          position: "absolute",
          left: 0,
          fontSize: 11,
          fontFamily: "Helvetica",
          color: "#9ca3af",
          width: MARGIN_LEFT - 8,
          textAlign: "right",
        },
        barValueLabel: {
          position: "absolute",
          fontSize: 11,
          fontFamily: "Helvetica",
          color: "#374151",
          textAlign: "center",
        },
        dayLabel: {
          position: "absolute",
          fontSize: 11,
          fontFamily: "Helvetica",
          color: "#6b7280",
          textAlign: "center",
        },
      }),
    [StyleSheet]
  )

  if (columns === 0) {
    return (
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>
          Monthly Trend — Dispatches Per Day
        </Text>
        <Text style={{ fontSize: 12, color: "#6b7280" }}>
          No dispatch data for the selected period.
        </Text>
      </Page>
    )
  }

  const barSpacing = Math.min(
    BAR_WIDTH + 4,
    (CHART_WIDTH - MARGIN_LEFT - 20) / columns
  )
  const availableWidth = CHART_WIDTH - MARGIN_LEFT - 20

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>
        Monthly Trend — Dispatches Per Day
      </Text>
      <View style={styles.chartContainer}>
        <View
          style={{
            position: "absolute",
            left: MARGIN_LEFT,
            bottom: MARGIN_BOTTOM,
            width: availableWidth,
            height: 1,
            backgroundColor: "#e5e7eb",
          }}
        />
        <View
          style={{
            position: "absolute",
            left: MARGIN_LEFT,
            bottom: MARGIN_BOTTOM,
            width: 1,
            height: MAX_BAR_HEIGHT,
            backgroundColor: "#e5e7eb",
          }}
        />
        {[0, 25, 50, 75, 100].map((pct) => {
          const _y = MARGIN_BOTTOM + MAX_BAR_HEIGHT * (pct / 100)
          return (
            <View key={pct}>
              <View
                style={{
                  position: "absolute",
                  left: MARGIN_LEFT,
                  top:
                    MARGIN_TOP +
                    MARGIN_BOTTOM / 2 +
                    (MAX_BAR_HEIGHT - MAX_BAR_HEIGHT * (pct / 100)),
                  height: 1,
                  width: availableWidth,
                  backgroundColor: "#f3f4f6",
                }}
              />
              <Text
                style={[
                  styles.yLabel,
                  {
                    top:
                      MARGIN_TOP +
                      MARGIN_BOTTOM / 2 +
                      (MAX_BAR_HEIGHT - MAX_BAR_HEIGHT * (pct / 100)) -
                      5,
                  },
                ]}
              >
                {Math.round(maxCount * (pct / 100))}
              </Text>
            </View>
          )
        })}
        {days.map((day, i) => {
          const count = dispatchesPerDay[day]
          const height = (count / maxCount) * MAX_BAR_HEIGHT
          const x = MARGIN_LEFT + i * barSpacing + 2
          const y = MARGIN_BOTTOM + MAX_BAR_HEIGHT - height + 15

          return (
            <View key={day}>
              <View
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: barSpacing - 4,
                  height: Math.max(1, height),
                  backgroundColor: "#3b82f6",
                  borderRadius: 2,
                }}
              />
              {count > 0 && (
                <Text
                  style={[
                    styles.barValueLabel,
                    {
                      left: x - 4,
                      top: y - 12,
                      width: barSpacing,
                    },
                  ]}
                >
                  {count}
                </Text>
              )}
              <Text
                style={[
                  styles.dayLabel,
                  {
                    left: x - 2,
                    top: MARGIN_BOTTOM + MAX_BAR_HEIGHT + 25,
                    width: barSpacing,
                  },
                ]}
              >
                {day.slice(-2)}
              </Text>
            </View>
          )
        })}
      </View>
    </Page>
  )
}
