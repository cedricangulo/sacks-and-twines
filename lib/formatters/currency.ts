export type FormatCurrencyOptions = {
  locale?: string
  currency?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  notation?: Intl.NumberFormatOptions["notation"]
}

// Small wrapper around Intl.NumberFormat for currency formatting used across features
export function formatCurrency(
  value: number,
  {
    locale = "en-PH",
    currency = "PHP",
    minimumFractionDigits,
    maximumFractionDigits,
    notation,
  }: FormatCurrencyOptions = {}
): string {
  const opts: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    notation,
  }
  if (typeof minimumFractionDigits === "number")
    opts.minimumFractionDigits = minimumFractionDigits
  if (typeof maximumFractionDigits === "number")
    opts.maximumFractionDigits = maximumFractionDigits
  return new Intl.NumberFormat(locale, opts).format(value)
}
