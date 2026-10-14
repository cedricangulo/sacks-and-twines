// Parses a JSON-encoded audit log description into a summary, optional changes diff, and optional details object. Falls back to the raw string on parse failure.
import { formatDateTime } from "@/lib/formatters"

// Renders a detail value for display. A `transactionDate` holds millis (see
// the backdated writes in `convex/*/mutations.ts`) and is formatted like the
// log's own Timestamp row — pinned to Asia/Manila so both rows agree in any
// browser zone. Everything else stringifies as before.
export function formatDetailValue(key: string, value: unknown): string {
  if (
    key === "transactionDate" &&
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return formatDateTime(value, { timeZone: "Asia/Manila" })
  }
  return String(value)
}
export function parseDescription(description: string): {
  summary: string
  changes: Record<string, { old: unknown; new: unknown }> | null
  details: Record<string, string> | null
  isFlat: boolean
} {
  try {
    const parsed = JSON.parse(description)
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      if (typeof parsed.summary === "string" || parsed.changes) {
        const details: Record<string, string> = {}
        if (parsed.details && typeof parsed.details === "object") {
          for (const [k, v] of Object.entries(parsed.details)) {
            details[k] = formatDetailValue(k, v)
          }
        }
        return {
          summary: parsed.summary ?? description,
          changes: parsed.changes || null,
          details: Object.keys(details).length > 0 ? details : null,
          isFlat: false,
        }
      }

      const parts: string[] = []
      if (parsed.reason) parts.push(parsed.reason)
      if (parsed.email) parts.push(`for ${parsed.email}`)
      if (parsed.action && !parts.length) parts.push(parsed.action)
      if (parsed.message) parts.push(parsed.message)
      return {
        summary: parts.length > 0 ? parts.join(" ") : description,
        changes: null,
        details: parsed as Record<string, string>,
        isFlat: true,
      }
    }
  } catch {
    // Not valid JSON
  }
  return { summary: description, changes: null, details: null, isFlat: true }
}

// Converts a snake_case field name to Title Case for display in change diffs (e.g. "unit_cost" → "Unit Cost").
export function formatChangeLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}
