import type { MutationCtx } from "../_generated/server"

const OR_TIME_ZONE = "Asia/Manila"

// Returns the `YYYYMMDD` portion of an OR number for the given timestamp in
// Philippine time, so late-evening dispatches group with their business day.
export function orDatePart(timestampMs: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: OR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(timestampMs)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("year")}${get("month")}${get("day")}`
}

// Generates an official receipt (OR) tracking number in the shape
// `OR-YYYYMMDD-####`. The 4-digit suffix is random and uniqueness-checked
// against the `by_orNumber` index within the same mutation, so no separate
// counter table is needed and concurrent submissions stay collision-safe.
export async function nextOrNumber(
  ctx: MutationCtx,
  timestampMs: number
): Promise<string> {
  const datePart = orDatePart(timestampMs)
  for (let i = 0; i < 20; i++) {
    const orNumber = `OR-${datePart}-${rndInt(1000, 9999)}`
    const existing = await ctx.db
      .query("dispatches")
      .withIndex("by_orNumber", (q) => q.eq("orNumber", orNumber))
      .first()
    if (existing === null) return orNumber
  }
  throw new Error("Failed to generate a unique OR number for dispatch")
}

function rndInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
