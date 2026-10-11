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
