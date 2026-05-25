export function getTimestampFromPreset(
  preset: string,
  now: number
): number | undefined {
  switch (preset) {
    case "today": {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }
    case "7d":
      return now - 7 * 86400000
    case "30d":
      return now - 30 * 86400000
    default:
      return undefined
  }
}
