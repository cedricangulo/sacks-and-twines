"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { useMutation } from "convex/react"
import { useRouter } from "next/navigation"
import { SubmitEvent, useEffect, useState } from "react"
import { api } from "@/convex/_generated/api"
import { ERROR_MESSAGES } from "@/convex/auth/verify"
import { OtpSchema, SignInSchema } from "../validation"

type Step = "credentials" | { email: string }

export const RESEND_COOLDOWN_MS = 60_000

export type ResendStatus =
  | { kind: "ok"; text: string }
  | { kind: "error"; text: string }
  | null

function useSubmitSignIn() {
  const { signIn } = useAuthActions()
  const router = useRouter()
  const logAttempt = useMutation(api.auth.logAttempt.logAttempt)
  const [step, setStep] = useState<Step>("credentials")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [resendPending, setResendPending] = useState(false)
  const [resendStatus, setResendStatus] = useState<ResendStatus>(null)
  const [otpKey, setOtpKey] = useState(0)
  // Timestamp (ms) when resending becomes allowed. Wall-clock based so
  // background-tab timer throttling can't distort the countdown.
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(
    null
  )
  const [now, setNow] = useState(() => Date.now())

  const isOtpStep = typeof step === "object"

  useEffect(() => {
    if (!isOtpStep) return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [isOtpStep])

  const secondsLeft =
    isOtpStep && resendAvailableAt !== null
      ? Math.max(0, Math.ceil((resendAvailableAt - now) / 1000))
      : 0
  const canResend = isOtpStep && !resendPending && !pending && secondsLeft <= 0

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
      setResendStatus(null)
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS)
      setNow(Date.now())
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

  const resendOtp = async () => {
    if (typeof step !== "object" || !canResend) return
    const email = step.email
    setResendPending(true)
    setResendStatus(null)
    try {
      const formData = new FormData()
      formData.set("flow", "resendOtp")
      formData.set("email", email)
      await signIn("password", formData)
      // Same generic message for existing and unknown emails so the
      // response cannot be used to enumerate accounts.
      setResendStatus({ kind: "ok", text: "New code sent. Check your email." })
      setOtpKey((k) => k + 1)
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS)
      setNow(Date.now())
    } catch (err) {
      const message = err instanceof Error ? err.message : ""
      if (message.includes(ERROR_MESSAGES.RESEND_LIMITED)) {
        setResendStatus({
          kind: "error",
          text: ERROR_MESSAGES.RESEND_LIMITED,
        })
      } else if (message.includes(ERROR_MESSAGES.ACCOUNT_DEACTIVATED)) {
        setResendStatus({
          kind: "error",
          text: "Your account has been deactivated. Please contact the administrator.",
        })
      } else {
        // Log the raw error so misclassified failures (e.g. a backend
        // running stale code without the resendOtp flow) stay debuggable
        // instead of surfacing as a misleading rate-limit message.
        console.error("Resend OTP failed", err)
        setResendStatus({
          kind: "error",
          text: "Couldn't resend the code. Please try again.",
        })
      }
    } finally {
      setResendPending(false)
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
    setResendStatus(null)
    setResendAvailableAt(null)
    setResendPending(false)
  }

  return {
    step,
    error,
    pending,
    submitCredentials,
    submitOtp,
    reset,
    resendOtp,
    resendPending,
    resendStatus,
    secondsLeft,
    canResend,
    otpKey,
  }
}

export { useSubmitSignIn }
