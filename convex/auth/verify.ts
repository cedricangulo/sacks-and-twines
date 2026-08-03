/**
 * User-facing error messages for credential validation failures.
 */
export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid email or password",
  RATE_LIMITED: "Too many sign-in attempts. Please try again later.",
  REQUIRED: "Email and password are required",
  INVALID_CODE: "Invalid or expired code",
  ACCOUNT_DEACTIVATED: "Your account has been deactivated",
} as const

/**
 * Validates sign-in credentials before passing them to the auth provider.
 *
 * - `signIn` flow requires email + password.
 * - `email-verification` flow requires email + code.
 *
 * @param params - Object containing `flow`, `email`, `password`, and `code`.
 * @throws If the flow is unsupported or required fields are missing.
 */
export function verifyCredentials(params: {
  flow: string
  email: string
  password: string
  code: string
}): void {
  if (params.flow === "signIn") {
    if (!params.email || !params.password) {
      throw new Error(ERROR_MESSAGES.REQUIRED)
    }
    return
  }

  if (params.flow === "email-verification") {
    if (!params.email || !params.code) {
      throw new Error(ERROR_MESSAGES.REQUIRED)
    }
    return
  }

  throw new Error(`Unsupported auth flow: ${params.flow}`)
}
