import { Email } from "@convex-dev/auth/providers/Email"
import { generateRandomString, RandomReader } from "@oslojs/crypto/random"
import { Resend as ResendAPI } from "resend"

const OTP_ALPHABET = "0123456789"
const OTP_LENGTH = 8

/**
 * Email provider that sends 8-digit one-time passcodes via Resend.
 * Used as the second factor in the sign-in flow (see `convex/auth.ts`).
 */
export const ResendOTP = Email({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 60 * 15,
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes)
      },
    }
    return generateRandomString(random, OTP_ALPHABET, OTP_LENGTH)
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey)
    const appName = "Sacks & Twines"
    const displayCode = `${token.slice(0, 4)}-${token.slice(4)}`

    const { error } = await resend.emails.send({
      from: `${appName} <onboarding@resend.dev>`,
      to: [email],
      subject: `${appName} verification code`,
      text: [
        `NEVER SHARE YOUR OTP. ${appName} will only ask for your OTP when signing in to the ${appName} app.`,
        "",
        `Your sign-in code is: ${displayCode}`,
        "",
        "If this was not you, please ignore this message.",
      ].join("\n"),
      html: [
        `<!DOCTYPE html>`,
        `<html>`,
        `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>`,
        `<body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">`,
        `  <p style="font-size:18px;font-weight:700;color:#dc2626;margin:0 0 16px">NEVER SHARE YOUR OTP</p>`,
        `  <p style="font-size:14px;color:#6b7280;margin:0 0 8px">especially on social media, SMS, or email links.</p>`,
        `  <p style="font-size:14px;color:#6b7280;margin:0 0 24px">${appName} will only ask for your OTP when signing in to the ${appName} app.</p>`,
        `  <div style="background:#f9fafb;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px">`,
        `    <p style="font-size:12px;color:#9ca3af;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.1em">Your sign-in code</p>`,
        `    <p style="font-size:32px;font-weight:700;letter-spacing:0.15em;color:#1a1a1a;margin:0;font-variant-numeric:tabular-nums">${displayCode}</p>`,
        `    <p style="font-size:12px;color:#9ca3af;margin:8px 0 0">Expires in 15 minutes</p>`,
        `  </div>`,
        `  <p style="font-size:12px;color:#d1d5db;margin:0">If this was not you, please ignore this message.</p>`,
        `</body>`,
        `</html>`,
      ].join("\n"),
    })

    if (error) {
      throw new Error(JSON.stringify(error))
    }
  },
})
