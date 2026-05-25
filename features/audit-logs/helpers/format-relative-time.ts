const abbreviations: Record<string, string> = {
  year: "y",
  month: "mo",
  week: "w",
  day: "d",
  hour: "h",
  minute: "m",
}

const units: [string, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
]

export function formatRelativeTime(timestamp: number): string {
  const diffSeconds = Math.floor((Date.now() - timestamp) / 1000)

  if (diffSeconds < 5) return "Just now"
  if (diffSeconds < 60) return `${diffSeconds}s ago`

  for (const [unit, secondsInUnit] of units) {
    const count = Math.floor(diffSeconds / secondsInUnit)
    if (count >= 1) {
      return `${count}${abbreviations[unit]} ago`
    }
  }

  return "Long ago"
}
