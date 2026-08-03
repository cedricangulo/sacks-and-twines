"use client"

import { REGEXP_ONLY_DIGITS } from "input-otp"
import { useRef } from "react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Spinner } from "@/components/ui/spinner"
import { useSubmitSignIn } from "@/features/auth/hooks/submit"

export default function SignInForm() {
  const { step, error, pending, submitCredentials, submitOtp, reset } =
    useSubmitSignIn()
  const otpFormRef = useRef<HTMLFormElement>(null)

  if (typeof step === "object") {
    return (
      <FieldGroup className="w-full mx-auto md:max-w-96">
        <form
          ref={otpFormRef}
          onSubmit={submitOtp}
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col gap-2">
            <p className="type-body-default text-muted-foreground">
              Check your email
            </p>
            <h2 className="font-semibold type-h3">Enter verification code</h2>
            <p className="text-sm text-muted-foreground">
              We sent an 8-digit code to{" "}
              <span className="font-medium text-foreground">{step.email}</span>
            </p>
          </div>

          <Field data-invalid={!!error}>
            <FieldLabel>Code</FieldLabel>
            <FieldContent>
              <InputOTP
                autoFocus
                maxLength={8}
                name="code"
                pattern={REGEXP_ONLY_DIGITS}
                aria-invalid={!!error}
                onComplete={() => {
                  if (!pending) otpFormRef.current?.requestSubmit()
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} aria-invalid={!!error} />
                  <InputOTPSlot index={1} aria-invalid={!!error} />
                  <InputOTPSlot index={2} aria-invalid={!!error} />
                  <InputOTPSlot index={3} aria-invalid={!!error} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={4} aria-invalid={!!error} />
                  <InputOTPSlot index={5} aria-invalid={!!error} />
                  <InputOTPSlot index={6} aria-invalid={!!error} />
                  <InputOTPSlot index={7} aria-invalid={!!error} />
                </InputOTPGroup>
              </InputOTP>
            </FieldContent>
          </Field>

          <Input name="email" type="hidden" value={step.email} />
          <Input name="flow" type="hidden" value="email-verification" />

          {error ? <FieldError>{error}</FieldError> : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Verify and sign in
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={reset}
            disabled={pending}
            className="w-full"
          >
            Use a different account
          </Button>
        </form>
      </FieldGroup>
    )
  }

  return (
    <FieldGroup className="w-full mx-auto md:max-w-96">
      <form onSubmit={submitCredentials} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="type-body-default text-muted-foreground">
            Welcome back
          </p>
          <h2 className="font-semibold type-h3">Sign in</h2>
        </div>

        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <FieldContent>
            <Input
              id="email"
              name="email"
              placeholder="Email"
              type="text"
              aria-invalid={!!error}
            />
          </FieldContent>
        </Field>

        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <FieldContent>
            <Input
              id="password"
              name="password"
              placeholder="Password"
              type="password"
              aria-invalid={!!error}
            />
          </FieldContent>
        </Field>

        <Input name="flow" type="hidden" value="signIn" />

        {error ? <FieldError>{error}</FieldError> : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <Spinner data-icon="inline-start" /> : null}
          Sign In
        </Button>
      </form>
    </FieldGroup>
  )
}
