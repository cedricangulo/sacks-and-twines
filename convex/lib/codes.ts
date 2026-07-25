export function generateCodeString(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const random = Math.floor(Math.random() * 9000 + 1000).toString()
  return `${prefix}-${date}-${random}`
}

export function makeRetryAttempts(prefix: string): () => string {
  let attempts = 0
  return () => {
    attempts++
    if (attempts > 20) {
      throw new Error(
        `Failed to generate unique ${prefix} code after 20 attempts`
      )
    }
    return generateCodeString(prefix)
  }
}
