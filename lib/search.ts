import { normalizeText } from "@/lib/validation"

/**
 * Search-term normalization for list filtering.
 *
 * Distinct from the form validators in `lib/validation.ts`: a search term is
 * free-form by nature and must never be *rejected* for containing a character
 * the user meant to type. `safeText` would refuse a query like `a/b` or `50%`;
 * here such input simply matches nothing or matches accordingly. Only
 * normalization applies here, never an allowlist.
 */

/**
 * Upper bound on a search term, in characters.
 *
 * Search terms live in the URL, so an unbounded term is a URL that gets copied
 * into bookmarks and shared links, and on the audit-log page it is also sent to
 * a Convex query on every keystroke. 128 comfortably covers a batch code, a
 * customer reference or a person's name.
 */
export const MAX_SEARCH_LENGTH = 128

/**
 * Cleans a raw search term for display and storage in the URL.
 *
 * Applies NFC, strips control characters, collapses whitespace runs and trims —
 * all via the shared `normalizeText`, so a search term and a form field are
 * normalized by exactly the same rules.
 *
 * Case is deliberately preserved: the returned value is what the search input
 * renders, and lowercasing here would rewrite the text as the user types.
 * Case-insensitive matching is `matchesSearch`'s job.
 *
 * The length cap is applied here rather than via an `maxLength` attribute on the
 * input so that the box and the results can never disagree. Truncating only
 * inside a predicate would leave the user staring at 300 characters in the input
 * while the table silently searched only the first 128.
 */
export function normalizeSearchTerm(raw: string | null | undefined): string {
  if (!raw) return ""

  // `normalizeText` already collapses whitespace before stripping control
  // characters, so tabs and newlines become spaces rather than being deleted.
  // No separate pre-collapse is needed here.
  return normalizeText(String(raw)).slice(0, MAX_SEARCH_LENGTH)
}

/**
 * Case-insensitive substring match for a single field.
 *
 * Falsy or empty `needle` matches everything, so callers can pass a normalized
 * term straight through without guarding each field.
 *
 * `haystack` is nullable because several searchable fields are optional
 * (`contactPerson`, `userName`, `keywords`); those become `""` rather than
 * throwing.
 */
export function matchesSearch(
  haystack: string | null | undefined,
  needle: string
): boolean {
  if (needle === "") return true
  // The haystack gets the same NFC/collapse treatment as the needle: a legacy
  // row stored pre-normalization (NFD `ñ`, double spacing) must still match
  // the normalized term the user typed.
  const hay = normalizeText(haystack ?? "").toLowerCase()
  return hay.includes(needle.toLowerCase())
}

/**
 * Numeric match for a raw number against a search term.
 *
 * Formatted renderings (`₱5,000.00`) defeat plain-digit queries — `"5000"` is
 * not a substring of `"5,000.00"`. This matches the raw `toString()` form and,
 * failing that, compares digit-stripped forms so `5000`, `5,000` and `₱5000`
 * all find a stored `5000`. Use alongside (not instead of) the formatted
 * `matchesSearch`, which still covers symbol-inclusive queries like `₱5,000`.
 */
export function matchesNumber(
  value: number | null | undefined,
  needle: string
): boolean {
  if (needle === "") return true
  if (value === null || value === undefined) return false
  const raw = String(value)
  if (raw.toLowerCase().includes(needle.toLowerCase())) return true
  const needleDigits = needle.replace(/[^0-9]/g, "")
  if (needleDigits === "") return false
  return raw.replace(/[^0-9]/g, "").includes(needleDigits)
}

/**
 * Builds the predicate for a record from a list of its searchable fields.
 *
 * Passing `undefined` as a field is how a record opts out — for example a
 * product with no keywords should not match on that field at all, which
 * `matchesSearch` handles because `undefined` coerces to `""`.
 */
export function searchPredicate<T>(
  needle: string,
  fields: (record: T) => (string | null | undefined)[]
): (record: T) => boolean {
  return (record) =>
    fields(record).some((field) => matchesSearch(field, needle))
}
