/**
 * Escapes a value for CSV output (handles commas, quotes, newlines) and
 * defuses formula injection: a cell starting with `=`, `+`, `-`, `@`, tab or
 * carriage return is prefixed with `'` so spreadsheet apps render it as text
 * instead of evaluating it (OWASP CSV Injection). The trimmed value is tested
 * too — some parsers strip leading whitespace before evaluating, so
 * `" =1+1"` is treated the same as `"=1+1"`. The prefix goes on before
 * quoting so it stays the first character of the parsed field.
 */
export function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ""
  let s = String(val)
  if (/^[=+\-@\t\r]/.test(s) || /^[=+\-@]/.test(s.trimStart())) s = `'${s}`
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}
