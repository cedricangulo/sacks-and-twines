const MANILA_TZ = "Asia/Manila"

/** Hoisted — reused per audit write; avoids rebuilding locale data. */
const BACKDATE_FMT = new Intl.DateTimeFormat("en-PH", {
  timeZone: MANILA_TZ,
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

/**
 * Formats a backdated business time for audit summaries, e.g.
 * "Nov 12, 2025, 2:35 PM". Pinned to Asia/Manila to match the client-side
 * detail rendering (`formatDetailValue` passes the same zone and options), so
 * the summary suffix and the detail row can never disagree across timezones.
 */
export function formatBackdate(timestampMs: number): string {
  return BACKDATE_FMT.format(new Date(timestampMs))
}
