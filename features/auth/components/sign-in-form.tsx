"use client"

import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { useRef, useState } from "react"

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
import { formatCountdown } from "@/lib/formatters/number"
import { EMAIL_MAX, OTP_LENGTH, PASSWORD_MAX } from "../validation"

export default function SignInForm() {
  const {
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
  } = useSubmitSignIn()
  const otpFormRef = useRef<HTMLFormElement>(null)
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false)

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
              We sent a code to your email. If your account is managed by an
              owner, check with them for the code.
            </p>
          </div>

          <Field data-invalid={!!error}>
            <FieldLabel>Code</FieldLabel>
            <FieldContent>
              <InputOTP
                key={otpKey}
                autoFocus
                maxLength={OTP_LENGTH}
                name="code"
                pattern={REGEXP_ONLY_DIGITS}
                pasteTransformer={(pasted) => pasted.replace(/\D/g, "")}
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

          <div className="flex flex-col items-center gap-1">
            <Button
              type="button"
              variant="link"
              onClick={resendOtp}
              disabled={!canResend}
              aria-describedby="otp-expiry-note"
            >
              {resendPending ? <Spinner data-icon="inline-start" /> : null}
              {secondsLeft > 0 ? (
                <span className="tabular-nums">
                  Resend code in {formatCountdown(secondsLeft)}
                </span>
              ) : (
                "Resend code"
              )}
            </Button>
            {resendStatus ? (
              <p
                role="status"
                aria-live="polite"
                className={
                  resendStatus.kind === "ok"
                    ? "type-caption text-muted-foreground"
                    : "type-caption text-destructive"
                }
              >
                {resendStatus.text}
              </p>
            ) : null}
          </div>

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
              maxLength={EMAIL_MAX}
              aria-invalid={!!error}
            />
          </FieldContent>
        </Field>

        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <FieldContent>
            <div className="relative">
              <Input
                id="password"
                name="password"
                placeholder="Password"
                type={isPasswordVisible ? "text" : "password"}
                maxLength={PASSWORD_MAX}
                aria-invalid={!!error}
                className="pe-9"
              />
              <button
                aria-controls="password"
                aria-label={
                  isPasswordVisible ? "Hide password" : "Show password"
                }
                aria-pressed={isPasswordVisible}
                className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 outline-none transition-[color,box-shadow] hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setIsPasswordVisible((prev) => !prev)}
                type="button"
              >
                {isPasswordVisible ? (
                  <EyeSlashIcon aria-hidden="true" size={16} weight="fill" />
                ) : (
                  <EyeIcon aria-hidden="true" size={16} weight="fill" />
                )}
              </button>
            </div>
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
