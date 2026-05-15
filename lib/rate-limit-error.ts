import { isRateLimitError } from "@convex-dev/rate-limiter"

type SileoErrorResult = { title: string; description: string }

export function sileoRateLimitError(
  err: unknown,
  defaultTitle: string
): SileoErrorResult {
  if (isRateLimitError(err)) {
    return {
      title: "Too many requests",
      description: `Please wait ${Math.ceil(err.data.retryAfter / 1000)} seconds before trying again.`,
    }
  }
  return {
    title: defaultTitle,
    description:
      err instanceof Error ? err.message : "An unexpected error occurred.",
  }
}
