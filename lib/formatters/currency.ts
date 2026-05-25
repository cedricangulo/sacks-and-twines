export type FormatCurrencyOptions = {
  locale?: string
  currency?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

// Small wrapper around Intl.NumberFormat for currency formatting used across features
export function formatCurrency(
  value: number,
  {
    locale = "en-PH",
    currency = "PHP",
    minimumFractionDigits,
    maximumFractionDigits,
  }: FormatCurrencyOptions = {}
): string {
  const opts: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
  }
  if (typeof minimumFractionDigits === "number")
    opts.minimumFractionDigits = minimumFractionDigits
  if (typeof maximumFractionDigits === "number")
    opts.maximumFractionDigits = maximumFractionDigits
  return value.toLocaleString(locale, opts)
}
