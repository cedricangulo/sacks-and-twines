import { z } from "zod"
import {
  keywordsSchema,
  MAX_COST,
  MAX_FACTOR,
  MAX_QUANTITY,
  NAME_ALLOWED,
  NUMERIC_MESSAGES,
  safeText,
} from "@/lib/validation"

/**
 * Field schemas shared across the feature forms.
 *
 * Centralizing these keeps a single definition of what a product name or a
 * money amount is, instead of each feature re-deriving its own and drifting.
 * The normalizer, character allowlists and keyword rules come from
 * `convex/validators/helpers` via `@/lib/validation`, so client and server
 * enforce the same rules rather than two lookalike copies.
 */

export const PRODUCT_NAME_MAX = 255

/**
 * Product and supplier names. The allowlist rejects rather than strips, so a
 * name containing `<` surfaces a field error instead of being silently altered.
 */
export const productNameField = (message = "Name is required") =>
  safeText(
    1,
    PRODUCT_NAME_MAX,
    NAME_ALLOWED,
    `${message} — letters, numbers, spaces and . - _ & ( ) / ' , only`
  )

/** Search keywords for a product. Shared with the server via `@/lib/validation`. */
export const keywordsField = keywordsSchema

/**
 * A quantity or cost that must be positive.
 *
 * `.finite()` is defence in depth rather than the check doing the work: zod 4's
 * base number type already rejects `Infinity`, but stating it explicitly means
 * the intent survives a zod upgrade that relaxes the type check. `Number("1e999")`
 * evaluates to `Infinity`, which would otherwise be an unbounded amount.
 */
export const positiveAmount = z
  .number({ error: NUMERIC_MESSAGES.invalidNumber })
  .finite(NUMERIC_MESSAGES.numberTooLarge)
  .min(0.01, NUMERIC_MESSAGES.greaterThanZero)
  .max(MAX_COST, NUMERIC_MESSAGES.amountTooLarge)

/** A quantity or threshold that may legitimately be zero but never infinite. */
export const nonNegativeAmount = z
  .number({ error: NUMERIC_MESSAGES.invalidNumber })
  .finite(NUMERIC_MESSAGES.numberTooLarge)
  .min(0, NUMERIC_MESSAGES.zeroOrGreater)
  .max(MAX_QUANTITY, NUMERIC_MESSAGES.quantityTooLarge)

/**
 * A quantity of stock for one operation. Tighter than `positiveAmount` because
 * quantities are multiplied together in aggregate asset calculations, so a
 * single absurd value distorts every total derived from it. Large on-hand
 * stock is moved in multiple operations rather than one oversized entry.
 */
export const positiveQuantity = z
  .number({ error: NUMERIC_MESSAGES.invalidNumber })
  .finite(NUMERIC_MESSAGES.numberTooLarge)
  .min(0.01, NUMERIC_MESSAGES.greaterThanZero)
  .max(MAX_QUANTITY, NUMERIC_MESSAGES.quantityTooLarge)

/** A unit conversion factor, e.g. how many pieces are in a roll. */
export const nonNegativeFactor = z
  .number({ error: NUMERIC_MESSAGES.invalidNumber })
  .finite(NUMERIC_MESSAGES.numberTooLarge)
  .min(0, NUMERIC_MESSAGES.zeroOrGreater)
  .max(MAX_FACTOR, NUMERIC_MESSAGES.factorTooLarge)

/**
 * Business-time override ("when it happened") shared by the stock-in,
 * dispatch and adjustment forms. Empty date input means "now" (undefined);
 * otherwise the YYYY-MM-DD value is resolved to local midnight millis.
 * Future dates are rejected at the form level via the input's `max`.
 */
export function dateInputToMs(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const ms = new Date(`${trimmed}T00:00:00`).getTime()
  return Number.isFinite(ms) ? ms : undefined
}

/** Current clock time as HH:MM for auto-filling an empty time input. */
export function nowTimeString(date = new Date()): string {
  return [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join(":")
}

/**
 * Combines a picked calendar date with an HH:MM time string into millis.
 * `undefined` date means "now" (the mutation stamps `Date.now()`).
 * An empty time falls back to the current clock time, so a backdated entry
 * keeps intra-day ordering instead of collapsing to midnight.
 */
export function dateTimeToMs(
  date: Date | undefined,
  time: string,
  now = new Date()
): number | undefined {
  if (!date) return undefined
  const trimmed = time.trim()
  const [hours, minutes] = trimmed
    ? trimmed.split(":").map(Number)
    : [now.getHours(), now.getMinutes()]
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return undefined
  }
  const combined = new Date(date)
  combined.setHours(hours, minutes, 0, 0)
  const ms = combined.getTime()
  return Number.isFinite(ms) ? ms : undefined
}

/** Today's date as YYYY-MM-DD for `<input type="date" max={...}>`. */
export function todayDateString(): string {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-")
}
