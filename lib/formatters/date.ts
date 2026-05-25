export type FormatDateOptions = Intl.DateTimeFormatOptions & {
  locale?: string
}

/**
 * Convert a number, string or Date to a Date object.
 * @param value
 * @type number | string | Date
 * @returns { Date }
 */
function toDate(value: number | string | Date) {
  return typeof value === "number" || typeof value === "string"
    ? new Date(value)
    : value
}

export function formatDateTime(
  value: number | string | Date,
  { locale = "en-PH", ...opts }: FormatDateOptions = {}
): string {
  const d = toDate(value)
  const defaultOpts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }
  return d.toLocaleString(locale, { ...defaultOpts, ...opts })
}

export function formatDate(
  value: number | string | Date,
  {
    locale = "en-PH",
    dateStyle = "medium" as const,
    ...opts
  }: FormatDateOptions = {}
) {
  const d = toDate(value)
  return d.toLocaleDateString(locale, { dateStyle, ...opts })
}

export function formatTime(
  value: number | string | Date,
  {
    locale = "en-PH",
    timeStyle = "short" as const,
    ...opts
  }: FormatDateOptions = {}
) {
  const d = toDate(value)
  return d.toLocaleTimeString(locale, { timeStyle, ...opts })
}
