"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { useMutation } from "convex/react"
import { useRouter } from "next/navigation"
import { SubmitEvent, useState } from "react"
import { z } from "zod"
import { api } from "@/convex/_generated/api"

/** Validates sign-in form payload before submission. */
const SignInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

/** Manages sign-in form state: submitted credentials, pending flag, and error display. Submits the password flow via Convex auth and logs the attempt. */
function useSubmitSignIn() {
  const { signIn } = useAuthActions()
  const router = useRouter()
  const logAttempt = useMutation(api.auth.logAttempt.logAttempt)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submitSignIn = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const formData = new FormData(event.currentTarget)
    const payload = {
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    }

    const parsed = SignInSchema.safeParse(payload)
    if (!parsed.success) {
      // Generic error for any validation failure (empty or invalid)
      setError("Please enter your email and password.")
      return
    }

    setPending(true)
    try {
      const result = await signIn("password", formData)
      if (result && typeof result === "object" && "signingIn" in result) {
        if (result.signingIn) {
          logAttempt({
            action: "auth_sign_in",
            email: parsed.data.email,
            resourceType: "user",
            userAgent: navigator.userAgent,
          }).catch(() => {})
          router.push("/")
        }
      } else if (result === undefined) {
        logAttempt({
          action: "auth_sign_in",
          email: parsed.data.email,
          resourceType: "user",
          userAgent: navigator.userAgent,
        }).catch(() => {})
        router.push("/")
      }
    } catch (err) {
      logAttempt({
        action: "auth_sign_in_failed",
        email: parsed.data.email,
        resourceType: "user",
        userAgent: navigator.userAgent,
      }).catch(() => {})

      const errorMessage = err instanceof Error ? err.message : ""
      const errorCause =
        err instanceof Error && err.cause instanceof Error
          ? err.cause
          : undefined
      const causeCode =
        errorCause && "code" in errorCause ? String(errorCause.code) : ""
      const isRateLimited =
        errorMessage.includes("RateLimited") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("Too many sign-in")
      const isNetworkError =
        errorMessage.includes("fetch failed") ||
        causeCode.includes("UND_ERR_CONNECT_TIMEOUT") ||
        causeCode.includes("ECONNREFUSED") ||
        causeCode.includes("ECONNRESET") ||
        causeCode.includes("ENOTFOUND") ||
        causeCode.includes("NetworkError")

      setError(
        isRateLimited
          ? "Too many sign-in attempts. Please try again later."
          : isNetworkError
            ? "Unable to connect. Please check your connection and try again."
            : "Invalid email or password. Please try again."
      )

      if (!isRateLimited) {
        console.error("Sign in failed", err)
      }
    } finally {
      setPending(false)
    }
  }

  return {
    error,
    pending,
    submitSignIn,
  }
}

export { useSubmitSignIn }
