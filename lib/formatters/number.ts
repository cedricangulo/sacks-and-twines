export type FormatNumberOptions = {
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  useGrouping?: boolean
}

export function formatNumber(
  value: number,
  {
    locale = "en-PH",
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping = true,
  }: FormatNumberOptions = {}
): string {
  const opts: Intl.NumberFormatOptions = { useGrouping }
  if (typeof minimumFractionDigits === "number")
    opts.minimumFractionDigits = minimumFractionDigits
  if (typeof maximumFractionDigits === "number")
    opts.maximumFractionDigits = maximumFractionDigits
  return new Intl.NumberFormat(locale, opts).format(value)
}

export function formatQuantity(value: number) {
  // default quantity formatting used in tables/UI that expect up to 4 fractional digits
  return formatNumber(value, { locale: "en-PH", maximumFractionDigits: 4 })
}

export function formatCompact(value: number) {
  if (value === 0) return "0"
  return new Intl.NumberFormat("en-PH", { notation: "compact" }).format(value)
}
