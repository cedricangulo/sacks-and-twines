"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { useMutation } from "convex/react"
import { useRouter } from "next/navigation"
import { SubmitEvent, useState } from "react"
import { z } from "zod"
import { api } from "@/convex/_generated/api"

const SignInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

const OtpSchema = z.object({
  code: z.string().min(8),
})

type Step = "credentials" | { email: string }

function useSubmitSignIn() {
  const { signIn } = useAuthActions()
  const router = useRouter()
  const logAttempt = useMutation(api.auth.logAttempt.logAttempt)
  const [step, setStep] = useState<Step>("credentials")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const handleError = (err: unknown, email: string, fallback: string) => {
    logAttempt({
      action: "auth_sign_in_failed",
      email,
      resourceType: "user",
      userAgent: navigator.userAgent,
    }).catch(console.error)

    const errorMessage = err instanceof Error ? err.message : ""
    const errorCause =
      err instanceof Error && err.cause instanceof Error ? err.cause : undefined
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

    const isDeactivated = errorMessage.includes("deactivated")

    setError(
      isRateLimited
        ? "Too many sign-in attempts. Please try again later."
        : isDeactivated
          ? "Your account has been deactivated. Please contact the administrator."
          : isNetworkError
            ? "Unable to connect. Please check your connection and try again."
            : fallback
    )

    if (!isRateLimited) {
      console.error("Sign in failed", err)
    }
  }

  const submitCredentials = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const formData = new FormData(event.currentTarget)
    const payload = {
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    }

    const parsed = SignInSchema.safeParse(payload)
    if (!parsed.success) {
      setError("Please enter your email and password.")
      return
    }

    setPending(true)
    try {
      await signIn("password", formData)
      setStep({ email: parsed.data.email })
    } catch (err) {
      handleError(
        err,
        parsed.data.email,
        "Invalid email or password. Please try again."
      )
    } finally {
      setPending(false)
    }
  }

  const submitOtp = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "").trim()
    const code = String(formData.get("code") ?? "")

    const parsed = OtpSchema.safeParse({ code })
    if (!parsed.success) {
      setError("Please enter the code we emailed you.")
      return
    }

    setPending(true)
    try {
      await signIn("password", formData)

      logAttempt({
        action: "auth_sign_in",
        email,
        resourceType: "user",
        userAgent: navigator.userAgent,
      }).catch(console.error)
      router.push("/")
    } catch (err) {
      handleError(err, email, "Invalid or expired code. Please try again.")
    } finally {
      setPending(false)
    }
  }

  const reset = () => {
    setStep("credentials")
    setError(null)
  }

  return {
    step,
    error,
    pending,
    submitCredentials,
    submitOtp,
    reset,
  }
}

export { useSubmitSignIn }
