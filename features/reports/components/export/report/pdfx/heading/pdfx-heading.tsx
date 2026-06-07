import type { Style } from "@react-pdf/types"
import type React from "react"
import { usePdfxTheme, useSafeMemo } from "@/lib/pdfx-theme-context"
import { usePdfPrimitives } from "../../pdf-primitives"

type PdfxTheme = ReturnType<typeof usePdfxTheme>

export type HeadingWeight = "normal" | "medium" | "semibold" | "bold"
export type HeadingTracking = "tighter" | "tight" | "normal" | "wide" | "wider"

export interface HeadingProps {
  style?: Style
  children: React.ReactNode
  level?: 1 | 2 | 3 | 4 | 5 | 6
  align?: "left" | "center" | "right"
  color?: string
  transform?: "uppercase" | "lowercase" | "capitalize"
  weight?: HeadingWeight
  tracking?: HeadingTracking
  noMargin?: boolean
  keepWithNext?: boolean
}

const THEME_COLOR_KEYS = [
  "foreground",
  "muted",
  "mutedForeground",
  "primary",
  "primaryForeground",
  "accent",
  "destructive",
  "success",
  "warning",
  "info",
] as const

function resolveColor(value: string, colors: Record<string, string>): string {
  return THEME_COLOR_KEYS.includes(value as (typeof THEME_COLOR_KEYS)[number])
    ? colors[value]
    : value
}

function createHeadingStyles(
  t: PdfxTheme,
  ss: { create: <T extends Record<string, Style>>(styles: T) => T }
) {
  const { heading } = t.typography
  const { spacing, fontWeights, letterSpacing } = t.primitives
  const { sectionGap, componentGap, paragraphGap } = t.spacing
  const base = {
    fontFamily: heading.fontFamily,
    fontWeight: fontWeights.bold,
    lineHeight: heading.lineHeight,
    color: t.colors.foreground,
  }
  return ss.create({
    h1: {
      ...base,
      fontSize: heading.fontSize.h1,
      marginTop: spacing[0],
      marginBottom: paragraphGap,
    },
    h2: {
      ...base,
      fontSize: heading.fontSize.h2,
      marginTop: sectionGap,
      marginBottom: paragraphGap,
    },
    h3: {
      ...base,
      fontSize: heading.fontSize.h3,
      marginTop: componentGap,
      marginBottom: paragraphGap,
    },
    h4: {
      ...base,
      fontSize: heading.fontSize.h4,
      marginTop: paragraphGap,
      marginBottom: paragraphGap,
    },
    h5: {
      ...base,
      fontSize: heading.fontSize.h5,
      marginTop: paragraphGap,
      marginBottom: spacing[1],
    },
    h6: {
      ...base,
      fontSize: heading.fontSize.h6,
      marginTop: paragraphGap,
      marginBottom: spacing[1],
    },
    weightNormal: { fontWeight: fontWeights.regular },
    weightMedium: { fontWeight: fontWeights.medium },
    weightSemibold: { fontWeight: fontWeights.semibold },
    weightBold: { fontWeight: fontWeights.bold },
    trackingTighter: { letterSpacing: letterSpacing.tight * 15 },
    trackingTight: { letterSpacing: letterSpacing.tight * 10 },
    trackingNormal: { letterSpacing: letterSpacing.normal },
    trackingWide: { letterSpacing: letterSpacing.wide * 10 },
    trackingWider: { letterSpacing: letterSpacing.wider * 10 },
    uppercase: {
      textTransform: "uppercase",
      letterSpacing: letterSpacing.wider * 10,
    },
    lowercase: { textTransform: "lowercase" },
    capitalize: { textTransform: "capitalize" },
    noMargin: { marginTop: 0, marginBottom: 0 },
  })
}

export function Heading({
  level = 1,
  align,
  color,
  transform,
  weight,
  tracking,
  noMargin,
  keepWithNext = true,
  children,
  style,
}: HeadingProps) {
  const theme = usePdfxTheme()
  const { StyleSheet, Text } = usePdfPrimitives()
  const styles = useSafeMemo(
    () => createHeadingStyles(theme, StyleSheet),
    [theme, StyleSheet]
  )
  const safeLevel = Math.min(Math.max(Math.round(level), 1), 6) as
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
  const weightMap = {
    normal: styles.weightNormal,
    medium: styles.weightMedium,
    semibold: styles.weightSemibold,
    bold: styles.weightBold,
  }
  const trackingMap = {
    tighter: styles.trackingTighter,
    tight: styles.trackingTight,
    normal: styles.trackingNormal,
    wide: styles.trackingWide,
    wider: styles.trackingWider,
  }
  const transformMap = {
    uppercase: styles.uppercase,
    lowercase: styles.lowercase,
    capitalize: styles.capitalize,
  }
  const styleArray: Style[] = [
    styles[`h${safeLevel}` as keyof typeof styles] as Style,
  ]
  if (weight && weight in weightMap) styleArray.push(weightMap[weight])
  if (tracking && tracking in trackingMap)
    styleArray.push(trackingMap[tracking])
  if (transform && transform in transformMap)
    styleArray.push(transformMap[transform as keyof typeof transformMap])
  if (noMargin) styleArray.push(styles.noMargin)
  const semantic = {} as Style
  if (align) semantic.textAlign = align
  if (color) semantic.color = resolveColor(color, theme.colors)
  if (Object.keys(semantic).length > 0) styleArray.push(semantic)
  if (style) styleArray.push(...[style].flat())
  return (
    <Text style={styleArray} minPresenceAhead={keepWithNext ? 80 : undefined}>
      {children}
    </Text>
  )
}
