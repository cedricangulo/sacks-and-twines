import type { Style } from "@react-pdf/types"
import type React from "react"
import { usePdfxTheme, useSafeMemo } from "@/lib/pdfx-theme-context"
import { usePdfPrimitives } from "../../pdf-primitives"

// type Style = Record<string, any>

type PdfxTheme = ReturnType<typeof usePdfxTheme>

export type TextVariant = "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl"
export type TextWeight = "normal" | "medium" | "semibold" | "bold"
export type TextDecoration = "underline" | "line-through" | "none"

export interface TextProps {
  style?: Style
  children: React.ReactNode
  variant?: TextVariant
  align?: "left" | "center" | "right" | "justify"
  color?: string
  weight?: TextWeight
  italic?: boolean
  decoration?: TextDecoration
  transform?: "uppercase" | "lowercase" | "capitalize"
  noMargin?: boolean
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

function createTextStyles(
  t: PdfxTheme,
  ss: { create: <T extends Record<string, Style>>(styles: T) => T }
) {
  const { fontWeights, letterSpacing } = t.primitives
  const base = {
    fontFamily: t.typography.body.fontFamily,
    lineHeight: t.typography.body.lineHeight,
    color: t.colors.foreground,
    marginBottom: t.spacing.paragraphGap,
    marginTop: 0,
  }
  return ss.create({
    text: { ...base, fontSize: t.typography.body.fontSize },
    xs: { ...base, fontSize: t.primitives.typography.xs },
    sm: { ...base, fontSize: t.primitives.typography.sm },
    base: { ...base, fontSize: t.primitives.typography.base },
    lg: { ...base, fontSize: t.primitives.typography.lg },
    xl: { ...base, fontSize: t.primitives.typography.xl },
    "2xl": { ...base, fontSize: t.primitives.typography["2xl"] },
    "3xl": { ...base, fontSize: t.primitives.typography["3xl"] },
    weightNormal: { fontWeight: fontWeights.regular },
    weightMedium: { fontWeight: fontWeights.medium },
    weightSemibold: { fontWeight: fontWeights.semibold },
    weightBold: { fontWeight: fontWeights.bold },
    italic: { fontStyle: "italic" },
    underline: { textDecoration: "underline" },
    lineThrough: { textDecoration: "line-through" },
    decorationNone: { textDecoration: "none" },
    uppercase: {
      textTransform: "uppercase",
      letterSpacing: letterSpacing.wider * 10,
    },
    lowercase: { textTransform: "lowercase" },
    capitalize: { textTransform: "capitalize" },
    noMargin: { marginBottom: 0, marginTop: 0 },
  })
}

export function Text({
  variant,
  align,
  color,
  weight,
  italic,
  decoration,
  transform,
  noMargin,
  children,
  style,
}: TextProps) {
  const theme = usePdfxTheme()
  const { StyleSheet, Text: PDFText } = usePdfPrimitives()
  const styles = useSafeMemo(
    () => createTextStyles(theme, StyleSheet),
    [theme, StyleSheet]
  )
  const weightMap = {
    normal: styles.weightNormal,
    medium: styles.weightMedium,
    semibold: styles.weightSemibold,
    bold: styles.weightBold,
  }
  const decorationMap = {
    underline: styles.underline,
    "line-through": styles.lineThrough,
    none: styles.decorationNone,
  }
  const transformMap = {
    uppercase: styles.uppercase,
    lowercase: styles.lowercase,
    capitalize: styles.capitalize,
  }
  const styleArray: Style[] = [variant ? styles[variant] : styles.text]
  if (weight && weight in weightMap) styleArray.push(weightMap[weight])
  if (italic) styleArray.push(styles.italic)
  if (decoration && decoration in decorationMap)
    styleArray.push(decorationMap[decoration])
  if (transform && transform in transformMap)
    styleArray.push(transformMap[transform])
  if (noMargin) styleArray.push(styles.noMargin)
  const semantic = {} as Style
  if (align) semantic.textAlign = align
  if (color) semantic.color = resolveColor(color, theme.colors)
  if (Object.keys(semantic).length > 0) styleArray.push(semantic)
  if (style) styleArray.push(...[style].flat())
  return <PDFText style={styleArray}>{children}</PDFText>
}
