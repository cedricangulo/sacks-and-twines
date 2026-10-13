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

export function formatCsv(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): string {
  const headerLine = headers.join(",")
  const bodyLines = rows.map((row) => row.map(escapeCsv).join(","))
  return `\uFEFF${headerLine}\n${bodyLines.join("\n")}`
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
