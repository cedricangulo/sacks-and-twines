import { describe, expect, it } from "vitest"
import {
  MAX_SEARCH_LENGTH,
  matchesNumber,
  matchesSearch,
  normalizeSearchTerm,
  searchPredicate,
} from "./search"

describe("normalizeSearchTerm", () => {
  it("returns an empty string for empty and absent input", () => {
    expect(normalizeSearchTerm("")).toBe("")
    expect(normalizeSearchTerm("   ")).toBe("")
    expect(normalizeSearchTerm(null)).toBe("")
    expect(normalizeSearchTerm(undefined)).toBe("")
  })

  it("trims surrounding whitespace", () => {
    expect(normalizeSearchTerm("  sack  ")).toBe("sack")
  })

  it("collapses internal whitespace runs", () => {
    // Without collapsing, "sack  b" is a term nothing can ever match.
    expect(normalizeSearchTerm("sack\t\tb")).toBe("sack b")
    expect(normalizeSearchTerm("sack \n b")).toBe("sack b")
  })

  it("strips control characters", () => {
    expect(normalizeSearchTerm("sa\u0000ck")).toBe("sack")
    expect(normalizeSearchTerm("sa\u0007ck")).toBe("sack")
    expect(normalizeSearchTerm("sa\u007Fck")).toBe("sack")
  })

  it("applies NFC so visually identical strings compare equal", () => {
    // "ñ" typed on macOS arrives as n + combining tilde, not U+00F1.
    expect(normalizeSearchTerm("cariño")).toBe(normalizeSearchTerm("cariño"))
  })

  it("preserves case, because the result is rendered in the input", () => {
    expect(normalizeSearchTerm("SACK")).toBe("SACK")
    expect(normalizeSearchTerm("Sack")).toBe("Sack")
  })

  it("truncates to MAX_SEARCH_LENGTH", () => {
    const long = "a".repeat(500)
    expect(normalizeSearchTerm(long)).toHaveLength(MAX_SEARCH_LENGTH)
    expect(normalizeSearchTerm(long)).toBe("a".repeat(MAX_SEARCH_LENGTH))
  })

  it("truncates after trimming, not before", () => {
    // Leading whitespace must not eat into the character budget.
    const padded = `${" ".repeat(50)}abc`
    expect(normalizeSearchTerm(padded)).toBe("abc")
  })

  it("leaves ordinary punctuation alone rather than rejecting it", () => {
    // Search must not apply a character allowlist — a query is not a field value.
    expect(normalizeSearchTerm("50% off")).toBe("50% off")
    expect(normalizeSearchTerm("a/b")).toBe("a/b")
    expect(normalizeSearchTerm("<b>sack")).toBe("<b>sack")
  })
})

describe("matchesSearch", () => {
  it("matches everything when the term is empty", () => {
    expect(matchesSearch("anything", "")).toBe(true)
    expect(matchesSearch("", "")).toBe(true)
    expect(matchesSearch(null, "")).toBe(true)
  })

  it("matches case-insensitively", () => {
    expect(matchesSearch("Sack A", "sack")).toBe(true)
    expect(matchesSearch("sack a", "SACK")).toBe(true)
  })

  it("matches substrings, not just prefixes", () => {
    expect(matchesSearch("Sack A", "ack")).toBe(true)
  })

  it("treats null and undefined haystacks as empty", () => {
    expect(matchesSearch(null, "sack")).toBe(false)
    expect(matchesSearch(undefined, "sack")).toBe(false)
  })

  it("does not match a term longer than the field", () => {
    expect(matchesSearch("sack", "sack a")).toBe(false)
  })

  it("normalizes the haystack like the needle", () => {
    // Legacy rows stored pre-normalization must still match a normalized term.
    expect(matchesSearch("Pen\u0303a", "peña")).toBe(true)
    expect(matchesSearch("Acme   Corp", "acme corp")).toBe(true)
  })
})

describe("matchesNumber", () => {
  it("matches everything when the term is empty", () => {
    expect(matchesNumber(5000, "")).toBe(true)
    expect(matchesNumber(null, "")).toBe(true)
  })

  it("matches the raw form", () => {
    expect(matchesNumber(5000, "5000")).toBe(true)
    expect(matchesNumber(4.5, "4.5")).toBe(true)
  })

  it("matches digit-stripped forms both ways", () => {
    // "5000" finds a ₱5,000.00 rendering; "5,000" finds a stored 5000.
    expect(matchesNumber(5000, "5,000")).toBe(true)
    expect(matchesNumber(5000, "₱5000")).toBe(true)
    expect(matchesNumber(1500.75, "1,500.75")).toBe(true)
  })

  it("rejects nullish values and non-numeric terms", () => {
    expect(matchesNumber(null, "5000")).toBe(false)
    expect(matchesNumber(undefined, "5000")).toBe(false)
    expect(matchesNumber(5000, "sack")).toBe(false)
    expect(matchesNumber(5000, "6000")).toBe(false)
  })
})

describe("searchPredicate", () => {
  interface Batch {
    batchCode: string
    supplierName: string
    receivedBy: string | null
  }

  const batch: Batch = {
    batchCode: "BAT-0001",
    supplierName: "Acme Textiles",
    receivedBy: null,
  }

  const fields = (b: Batch) => [b.batchCode, b.supplierName, b.receivedBy]

  it("matches when any one field matches", () => {
    expect(searchPredicate("bat", fields)(batch)).toBe(true)
    expect(searchPredicate("acme", fields)(batch)).toBe(true)
  })

  it("does not match when no field matches", () => {
    expect(searchPredicate("nothing", fields)(batch)).toBe(false)
  })

  it("skips null fields rather than throwing", () => {
    const pred = searchPredicate("owner", (b: Batch) => [b.receivedBy])
    expect(pred(batch)).toBe(false)
  })

  it("returns true for an empty term even when no field matches", () => {
    // `matchesSearch` returns true on an empty needle before comparing, so an
    // empty box yields the unfiltered list rather than nothing.
    const pred = searchPredicate("", () => ["unrelated"])
    expect(pred(batch)).toBe(true)
  })
})
