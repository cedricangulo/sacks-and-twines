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
  return value.toLocaleString(locale, opts)
}

export function formatQuantity(value: number) {
  return formatNumber(value, { locale: "en-PH", maximumFractionDigits: 4 })
}
