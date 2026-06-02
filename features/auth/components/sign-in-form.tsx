"use client"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useSubmitSignIn } from "@/features/auth/hooks/submit"

// Email/password sign-in form with validation, rate-limit feedback, and error display.
export default function SignInForm() {
  const { error, pending, submitSignIn } = useSubmitSignIn()

  return (
    <FieldGroup className="w-full mx-auto md:max-w-96">
      <form onSubmit={submitSignIn} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="type-base text-muted-foreground">Welcome back</p>
          <h2 className="font-semibold type-lg">Sign in</h2>
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
