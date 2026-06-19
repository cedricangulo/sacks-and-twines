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

const INDIVIDUAL_FIELD_KEYS = [
  "weekday",
  "era",
  "year",
  "month",
  "day",
  "hour",
  "minute",
  "second",
  "fractionalSecondDigits",
  "timeZoneName",
  "timeZone",
] as const satisfies ReadonlyArray<keyof Intl.DateTimeFormatOptions>

function hasExplicitFields(opts: Intl.DateTimeFormatOptions): boolean {
  return INDIVIDUAL_FIELD_KEYS.some((key) => key in opts)
}

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function getCachedFormatter(
  locale: string,
  opts: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(opts)}`
  let formatter = formatterCache.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, opts)
    formatterCache.set(key, formatter)
  }
  return formatter
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
  return getCachedFormatter(locale, {
    ...defaultOpts,
    ...opts,
  }).format(d)
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
  const resolved = hasExplicitFields(opts) ? opts : { dateStyle, ...opts }
  return getCachedFormatter(locale, resolved).format(d)
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
  const resolved = hasExplicitFields(opts) ? opts : { timeStyle, ...opts }
  return getCachedFormatter(locale, resolved).format(d)
}
