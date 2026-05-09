"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { useRouter } from "next/navigation"
import { SubmitEvent, useState } from "react"
import { z } from "zod"

const SignInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

function useSubmitSignIn() {
  const { signIn } = useAuthActions()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

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

    try {
      const result = await signIn("password", formData)
      if (result && typeof result === "object" && "signingIn" in result) {
        if (result.signingIn) {
          router.replace("/")
        }
      } else if (result === undefined) {
        // signIn may return undefined for some flows; still navigate
        router.replace("/")
      }
    } catch (err) {
      setError("Invalid email or password. Please try again.")
      console.error("Sign in failed", err)
    }
  }

  return {
    error,
    submitSignIn,
  }
}

export { useSubmitSignIn }
