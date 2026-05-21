export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid email or password",
  RATE_LIMITED: "Too many sign-in attempts. Please try again later.",
  REQUIRED: "Email and password are required",
} as const

export function verifyCredentials(params: {
  flow: string
  email: string
  password: string
}): void {
  if (params.flow !== "signIn") {
    throw new Error(`Unsupported auth flow: ${params.flow}`)
  }
  if (!params.email || !params.password) {
    throw new Error(ERROR_MESSAGES.REQUIRED)
  }
}
