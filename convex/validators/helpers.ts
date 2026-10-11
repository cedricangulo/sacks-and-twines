import { z } from "zod"

/**
 * Normalizes product keywords: trims, lowercases, collapses whitespace,
 * drops empties, and dedupes. Returns `undefined` when nothing remains so
 * the optional schema field stays absent.
 */
export function normalizeKeywords(
  keywords: string[] | undefined | null
): string[] | undefined {
  if (!keywords) return undefined
  const seen = new Set<string>()
  for (const raw of keywords) {
    const clean = String(raw ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase()
    if (clean.length > 0 && !seen.has(clean)) seen.add(clean)
  }
  return seen.size > 0 ? [...seen] : undefined
}

/**
 * Normalizes free-text input: applies Unicode NFC, strips control characters,
 * and collapses whitespace.
 *
 * This function never rejects and never removes a character the user may have
 * meant to type. Invalid content is rejected by the schema layer via
 * {@link safeText}, not silently deleted here — an earlier version stripped
 * `/<[^>]*>/`, which mangled legitimate input (`R&D <Sacks>`) while implying
 * the value had been made safe. See OWASP Input Validation Cheat Sheet:
 * denylisting is a supplementary layer, not a primary control.
 *
 * NFC matters beyond cosmetic reasons: `ñ` exists as either U+00F1 or as `n`
 * plus U+0303. Visually identical, different strings. The `products.by_name`
 * index holds the raw value, so un-normalized input would let two identical
 * product names coexist and slip past the duplicate check in
 * `batches.mutations.stockIn`.
 */
export function normalizeText(value: string): string
export function normalizeText(value: unknown): unknown
export function normalizeText(value: unknown): unknown {
  // Non-strings pass through untouched so the downstream `z.string()` rejects
  // them. Coercing here (`String(123)` → `"123"`) would let a mistyped direct
  // mutation caller pass validation that the schema promises to enforce.
  if (typeof value !== "string") return value
  let clean = value.normalize("NFC")
  // Collapse whitespace *before* stripping control characters. The reverse
  // order deletes newlines outright — "\n" is 0x0A, inside the stripped range —
  // so a two-line void reason was stored as "Damagedgoods, wrong". Collapsing
  // first turns the newline into a space and preserves the word boundary.
  clean = clean.replace(/\s+/g, " ")
  clean = clean.replace(/[\x00-\x1F\x7F]/g, "")
  clean = clean.trim()
  return clean
}

/**
 * Creates a zod preprocess chain that normalizes input text and enforces
 * length constraints.
 *
 * Normalizes only — it does not reject on content. Use {@link safeText} for
 * fields that should also enforce a character allowlist.
 *
 * @param min - Minimum character length (after normalization).
 * @param max - Maximum character length (after normalization).
 * @param message - Optional custom validation message.
 */
export const normalizedString = (min: number, max: number, message?: string) =>
  z.preprocess(
    // Non-strings pass through `normalizeText` untouched so `z.string()`
    // rejects them at runtime. The cast only satisfies the preprocessor
    // signature — the schema output stays `string` because a non-string input
    // never validates.
    (value: unknown) => normalizeText(value) as string,
    z
      .string()
      .min(min, message ?? `Must be at least ${min} characters`)
      .max(max, message ?? `Must be at most ${max} characters`)
  )

/**
 * {@link normalizedString} plus an explicit character allowlist, which rejects
 * rather than strips. Users see a field error instead of watching their input
 * change underneath them.
 *
 * The allowlists below are built from Unicode character *categories* rather
 * than ASCII ranges on purpose: this is a Philippine application, where
 * `O'Brien`, `Dela Peña` and `Ñ` are ordinary input. `[^a-zA-Z0-9 ]` would
 * reject real users. See "Character category allowlisting" in the OWASP Input
 * Validation Cheat Sheet.
 */

/** Letters and digits, plus the punctuation that appears in real names. */
const NAME_PUNCTUATION = " .\\-_&()/',"

/**
 * Names tolerate `&`, `'` and `-` (e.g. "O'Brien", "Dela Peña", "AT&T").
 *
 * Anchored on both ends: an unanchored pattern matches if *any* substring is
 * permitted, so "<b>Acme</b>" would pass. The whole value must consist of
 * allowed characters.
 */
export const NAME_ALLOWED = new RegExp(
  `^[\\p{L}\\p{N}${NAME_PUNCTUATION}]+$`,
  "u"
)

/**
 * Free-text narrative fields. Deliberately permissive — a void reason is an
 * explanation, not a structured value, and these reach the audit log rather
 * than an HTML sink. Control characters are already removed by normalization.
 *
 * `\p{S}` covers currency and symbol characters — `+`, `~`, `₱` and so on. A
 * peso amount in a reason ("Value ₱5,000") is ordinary input for this
 * application. `=`, `<` and `>` are then excluded by the lookahead: angle
 * brackets carry no meaning in a void reason but do carry markup, and a
 * leading `=` is unwelcome in stored text. The actual CSV formula-injection
 * control is `escapeCsv` at the export sink, since `+`/`-`/`@` prefixes are
 * legitimate input here and reach exports too.
 */
export const FREE_TEXT_ALLOWED =
  /^(?![\s\S]*[=<>])[\p{L}\p{N}\p{P}\p{Zs}\p{S}]+$/u

/**
 * Customer references and plate numbers.
 *
 * Tolerates the punctuation a customer name realistically contains — comma,
 * apostrophe and ampersand ("Acme Trading, Inc.", "Juan's Shop", "Dela Cruz
 * & Sons") — while excluding `=`, `<` and `>`, which have no place in a name
 * or plate number. Spreadsheet formula safety is handled at the export sink
 * by `escapeCsv`, not here.
 */
export const REFERENCE_ALLOWED = /^[\p{L}\p{N} .,'&()\-_/#]+$/u

/**
 * Search keywords for a product.
 *
 * Shared by `products` and `batches` validators so the two write paths cannot
 * drift. The client mirror lives in `lib/form-primitives.ts` (`keywordsField`).
 *
 * Deliberately not trimmed before the `.min(1)` check: blank entries such as
 * "  " are longer than one character, so they pass here and are dropped by
 * `normalizeKeywords` when the mutation stores the product. Trimming first
 * would reject input the caller is meant to tolerate.
 *
 * The array cap of 12 is well above the seed data, which tops out at 5
 * keywords per product.
 */
export const keywordsSchema = z.optional(
  z.array(z.string().min(1).max(20)).max(12)
)

/**
 * Normalizes, length-checks, and rejects characters outside `allowed`.
 *
 * @param min - Minimum character length (after normalization).
 * @param max - Maximum character length (after normalization).
 * @param allowed - Anchored pattern the normalized value must fully match.
 * @param message - Message shown when the allowlist rejects the value.
 */
export const safeText = (
  min: number,
  max: number,
  allowed: RegExp,
  message = "Contains invalid characters"
) => normalizedString(min, max).refine((v) => allowed.test(v), message)

/**
 * An optional field that is normalized, length-capped and allowlist-checked,
 * where a blank entry means "not provided".
 *
 * Exists because `z.optional(safeText(...))` is a trap for form-backed fields.
 * `z.optional` admits `undefined` but not `""`, and controlled React inputs
 * initialize to `""` — so an optional field left blank fails its own `.min(1)`
 * and blocks submission. Coercing at each call site with `value || undefined`
 * works but is easy to forget, and it only papers over the problem.
 *
 * Here the rule is stated once: `undefined` and `""` both mean "not provided".
 * Note the normalization happens before the emptiness check, so a field of
 * only whitespace also collapses to "not provided".
 *
 * @param max - Maximum character length (after normalization).
 * @param allowed - Anchored pattern the normalized value must fully match.
 * @param message - Message shown when the allowlist rejects the value.
 */
export const optionalSafeText = (
  max: number,
  allowed: RegExp,
  message = "Contains invalid characters"
) =>
  z
    .string()
    // Input is already `string` here (`z.string()` above), so the overload
    // resolves to `string` and the chain stays typed. Non-strings never reach
    // this transform — they fail `z.string()` first.
    .transform((v: string) => normalizeText(v))
    .refine(
      (v) => v === "" || v.length <= max,
      `Must be at most ${max} characters`
    )
    .refine((v) => v === "" || allowed.test(v), message)
    .transform((v) => (v === "" ? undefined : v))
    .optional()

/**
 * Business guard rails for stored numeric fields.
 *
 * `.min(0.01)` alone only rejects zero and negatives, so `1e95` was accepted as
 * a quantity or a peso cost: it is finite and comfortably above the floor. A
 * number that large poisons every downstream sum — `totalAssetValue` is
 * `quantity * unitCost`, so one such batch makes aggregate totals permanently
 * wrong.
 *
 * These ceilings are set from observed history: batches through this codebase
 * have not exceeded about 4,500 units, a ~₱562,258 procurement cost, or a
 * conversion factor of 50. They allow more than 20× headroom above those
 * values, while making an exponent typo or pasted scientific-notation value
 * fail immediately. Raise them only if a legitimate order needs more room.
 *
 * These ceilings guard one write operation, not a lifetime total: each stock-in,
 * dispatch line-item quantity and stock adjustment must fit within them. A
 * dispatch or adjustment can therefore be rejected even when a product's
 * accumulated `currentQuantity` is larger; that is intentional, and the large
 * movement should be split into multiple operations.
 *
 * Do not reuse these ceilings for derived fields such as `currentQuantity` or
 * `totalAssetValue`; those accumulate across batches and legitimately can grow
 * beyond one entry's ceiling.
 */
export const MAX_QUANTITY = 100_000
export const MAX_COST = 10_000_000
export const MAX_FACTOR = 1_000

/**
 * Shared numeric-validation wording.
 *
 * These errors can surface directly beside a form field, so they say what to
 * do next instead of naming a Zod concept. Every client and server numeric
 * schema should use these constants so the same invalid value cannot produce
 * two different messages depending on which side rejects it.
 */
export const NUMERIC_MESSAGES = {
  invalidNumber: "Please enter a number.",
  numberTooLarge: "That number is too large.",
  greaterThanZero: "Please enter a number greater than 0.",
  zeroOrGreater: "Please enter 0 or a larger number.",
  amountTooLarge: `Please enter an amount of ${MAX_COST.toLocaleString("en-US")} or less.`,
  quantityTooLarge: `Please enter a quantity of ${MAX_QUANTITY.toLocaleString("en-US")} or less.`,
  factorTooLarge: `Please enter a conversion factor of ${MAX_FACTOR.toLocaleString("en-US")} or less.`,
  wholeNumber: "Quantity must be a whole number.",
} as const

/**
 * Validates and normalizes Philippine phone numbers (mobile or landline).
 * Strips non-digit characters and enforces standard PH formats.
 */
export const contactNumberSchema = z
  .string()
  .transform((value) => {
    const clean = String(value ?? "").replace(/[\x00-\x1F\x7F]/g, "")
    const digits = clean.replace(/[^\d]/g, "")
    const hasPlus = clean.trim().startsWith("+")
    return hasPlus ? `+${digits}` : digits
  })
  .superRefine((value, ctx) => {
    const isMobile = /^(\+?639|09)\d{9}$/.test(value)
    const isLandline = /^(\+?63\d{1,2}|0\d{1,2})\d{7}$/.test(value)

    if (!isMobile && !isLandline) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Please enter a valid PH mobile (e.g., 0917...) or landline number.",
      })
    }
  })
