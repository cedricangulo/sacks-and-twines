/**
 * User-facing error messages for credential validation failures.
 */
export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid email or password",
  RATE_LIMITED: "Too many sign-in attempts. Please try again later.",
  REQUIRED: "Email and password are required",
} as const

/**
 * Validates sign-in credentials before passing them to the auth provider.
 * Ensures flow is "signIn" and that email/password are non-empty.
 *
 * @param params - Object containing `flow`, `email`, and `password`.
 * @throws If the flow is unsupported or credentials are missing.
 */
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
