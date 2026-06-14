import { useMemo } from "react"
import { usePdfPrimitives } from "./pdf-primitives"

type CoverPageProps = {
  monthLabel: string
  generatedDate: string
}

export function CoverPage({ monthLabel, generatedDate }: CoverPageProps) {
  const { Page, StyleSheet, Text, View } = usePdfPrimitives()

  const styles = useMemo(
    () =>
      StyleSheet.create({
        page: {
          flexDirection: "column",
          backgroundColor: "#ffffff",
          padding: 40,
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        },
        title: {
          fontSize: 28,
          fontFamily: "Helvetica-Bold",
          textAlign: "center",
          color: "#1a1a2e",
          marginBottom: 8,
        },
        subtitle: {
          fontSize: 16,
          fontFamily: "Helvetica",
          textAlign: "center",
          color: "#6b7280",
        },
        date: {
          fontSize: 14,
          fontFamily: "Helvetica",
          textAlign: "center",
          color: "#374151",
          marginTop: 16,
        },
        divider: {
          width: 60,
          height: 2,
          backgroundColor: "#3b82f6",
          marginVertical: 20,
          alignSelf: "center",
        },
        companyName: {
          fontSize: 12,
          fontFamily: "Helvetica",
          textAlign: "center",
          color: "#6b7280",
          marginTop: 40,
        },
      }),
    [StyleSheet]
  )

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.divider} />
      <Text style={styles.title}>Sacks & Twines</Text>
      <Text style={styles.subtitle}>Monthly Operations Report</Text>
      <Text style={styles.date}>{monthLabel}</Text>
      <Text style={styles.companyName}>Generated on {generatedDate}</Text>
    </Page>
  )
}
