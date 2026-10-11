import { describe, expect, it } from "vitest"
import {
  FREE_TEXT_ALLOWED,
  NAME_ALLOWED,
  normalizedString,
  normalizeText,
  optionalSafeText,
  REFERENCE_ALLOWED,
  safeText,
} from "./helpers"

describe("normalizeText", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalizeText("  Acme   Corp  ")).toBe("Acme Corp")
  })

  it("strips control characters", () => {
    expect(normalizeText("Acme\x00Corp\x7F")).toBe("AcmeCorp")
  })

  it("turns a newline into a space rather than deleting it", () => {
    // Ordering matters: stripping control characters before collapsing
    // whitespace deletes "\n" (0x0A) outright and joins the words together.
    expect(normalizeText("Damaged\ngoods")).toBe("Damaged goods")
    expect(normalizeText("line1\r\nline2")).toBe("line1 line2")
    expect(normalizeText("a\tb")).toBe("a b")
  })

  it("applies Unicode NFC so equivalent forms compare equal", () => {
    // "ñ" as a single code point (NFC, U+00F1) vs "n" + combining tilde
    // (NFD, U+006E U+0303). The products.by_name index stores the raw value,
    // so an un-normalized name would duplicate-check against a different string.
    const nfc = "Pe\u00F1a"
    const nfd = "Pen\u0303a"
    expect(nfc).not.toBe(nfd)
    expect(normalizeText(nfd)).toBe(nfc)
  })

  it("preserves characters that are not HTML-specific", () => {
    // The previous implementation stripped /<[^>]*>/, which mangled these.
    expect(normalizeText("AT&T")).toBe("AT&T")
    expect(normalizeText("a < b")).toBe("a < b")
    expect(normalizeText("R&D <Sacks>")).toBe("R&D <Sacks>")
  })

  it("passes nullish input through so schemas reject it", () => {
    // `normalizeText` used to coerce to `""`, which let `safeText(1, …)`
    // reject nullish only via length — and let `safeText(0, …)` accept it.
    // Passing through keeps the `z.string()` type check intact.
    expect(normalizeText(null)).toBeNull()
    expect(normalizeText(undefined)).toBeUndefined()
  })

  it("passes non-string input through instead of coercing it", () => {
    expect(normalizeText(123)).toBe(123)
  })
})

describe("normalizedString", () => {
  it("accepts input within the length bounds", () => {
    const schema = normalizedString(1, 10)
    expect(schema.safeParse("  Acme  ").success).toBe(true)
  })

  it("rejects input that is empty after normalization", () => {
    const schema = normalizedString(1, 10)
    // Passes a naive .min(1) on the raw string, fails once trimmed.
    expect(schema.safeParse("     ").success).toBe(false)
  })

  it("rejects input longer than the maximum", () => {
    const schema = normalizedString(1, 5)
    expect(schema.safeParse("Acme Corp").success).toBe(false)
  })

  it("rejects non-string input instead of coercing it", () => {
    const schema = normalizedString(1, 10)
    expect(schema.safeParse(123).success).toBe(false)
    expect(schema.safeParse(null).success).toBe(false)
  })
})

describe("NAME_ALLOWED", () => {
  it.each([
    "Polypropylene Sack 50kg",
    "O'Brien",
    "Dela Peña",
    "Ñ",
    "AT&T",
    "Twine 2mm (Natural)",
    "Café",
    // Non-Latin scripts must survive: character categories, not ASCII ranges.
    "Δέλτα",
    "Мешок",
    " sacks ",
  ])("accepts %j", (value) => {
    expect(NAME_ALLOWED.test(value)).toBe(true)
  })

  it.each([
    "<script>alert(1)</script>",
    "a<b",
    "a>b",
    "user@host",
    "name;drop",
    "cmd|calc",
  ])("rejects %j", (value) => {
    expect(NAME_ALLOWED.test(value)).toBe(false)
  })
})

describe("REFERENCE_ALLOWED", () => {
  it.each([
    "ABC-1234",
    "Juan Dela Cruz",
    "Plate #42",
    "Rider 7/B",
    // Customer names in the wild — these were rejected before the allowlist
    // gained comma, apostrophe and ampersand.
    "Acme Trading, Inc.",
    "Juan's Shop",
    "Dela Cruz & Sons",
  ])("accepts %j", (value) => {
    expect(REFERENCE_ALLOWED.test(value)).toBe(true)
  })

  it("rejects a leading equals sign (CSV formula injection)", () => {
    expect(REFERENCE_ALLOWED.test("=cmd|'/c calc'!A0")).toBe(false)
    expect(REFERENCE_ALLOWED.test('=HYPERLINK("http://evil")')).toBe(false)
  })

  it("rejects angle brackets", () => {
    expect(REFERENCE_ALLOWED.test("<script>")).toBe(false)
  })
})

describe("FREE_TEXT_ALLOWED", () => {
  it("accepts ordinary narrative punctuation", () => {
    expect(
      FREE_TEXT_ALLOWED.test("Damaged goods — wrong item, arrived wet.")
    ).toBe(true)
  })

  it("rejects control characters", () => {
    expect(FREE_TEXT_ALLOWED.test("bad\x00value")).toBe(false)
  })

  it("accepts currency and arithmetic symbols", () => {
    // A peso amount is ordinary input for a Philippine inventory app.
    expect(FREE_TEXT_ALLOWED.test("Value ₱5,000")).toBe(true)
    expect(FREE_TEXT_ALLOWED.test("Damaged + water soaked")).toBe(true)
    expect(FREE_TEXT_ALLOWED.test("count ~ 40 units")).toBe(true)
  })

  it("rejects '=' (CSV formula prefix) and angle brackets", () => {
    expect(FREE_TEXT_ALLOWED.test("=cmd|'/c calc'!A0")).toBe(false)
    expect(FREE_TEXT_ALLOWED.test("<b>tag</b>")).toBe(false)
  })
})

describe("optionalSafeText", () => {
  const schema = optionalSafeText(255, NAME_ALLOWED, "Invalid characters")

  it("accepts undefined", () => {
    const result = schema.safeParse(undefined)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBeUndefined()
    }
  })

  it("treats an empty string as not provided", () => {
    // The whole point: `z.optional` admits undefined but not "", and controlled
    // inputs initialize to "".
    const result = schema.safeParse("")
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBeUndefined()
    }
  })

  it("treats a whitespace-only string as not provided", () => {
    const result = schema.safeParse("   \n  ")
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBeUndefined()
    }
  })

  it("normalizes a real value and preserves it", () => {
    const result = schema.safeParse("  O'Brien Corp  ")
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe("O'Brien Corp")
    }
  })

  it("still rejects disallowed characters", () => {
    expect(schema.safeParse("<b>x</b>").success).toBe(false)
  })

  it("still enforces the length cap", () => {
    expect(schema.safeParse("x".repeat(256)).success).toBe(false)
  })

  it("preserves newlines as word boundaries", () => {
    const result = schema.safeParse("line one\nline two")
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe("line one line two")
    }
  })
})

describe("safeText", () => {
  const schema = safeText(1, 255, NAME_ALLOWED, "Invalid characters")

  it("rejects rather than strips, so bad input never silently changes", () => {
    const result = schema.safeParse("<b>Acme</b>")
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Invalid characters")
    }
  })

  it("accepts allowed input", () => {
    expect(schema.safeParse("O'Brien Corp").success).toBe(true)
  })

  it("enforces length alongside the allowlist", () => {
    const short = safeText(1, 3, NAME_ALLOWED)
    expect(short.safeParse("Acme").success).toBe(false)
  })

  it("rejects non-string input instead of coercing it", () => {
    expect(schema.safeParse(123).success).toBe(false)
  })
})
