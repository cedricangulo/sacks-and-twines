export const shortDateFmt = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
})

export const weekdayDateFmt = new Intl.DateTimeFormat("en-PH", {
  weekday: "short",
  month: "short",
  day: "numeric",
})

export const hmsTimeFmt = new Intl.DateTimeFormat("en-PH", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
})

// `Intl.NumberFormat.prototype.format` is a bound getter — safe to extract.
export const intFmt = new Intl.NumberFormat("en-PH").format
