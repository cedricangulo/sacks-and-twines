import { isRateLimitError } from "@convex-dev/rate-limiter"

type ErrorResult = { title: string; description: string }

type ErrorPattern = {
  match: string
  result: ErrorResult | ((message: string) => ErrorResult)
}

// Ordered most-specific first — first match wins
const errorPatterns: ErrorPattern[] = [
  // ── Auth / Session ──────────────────────────────────────
  {
    match: "Unauthorized",
    result: {
      title: "Session expired",
      description: "Please sign in again.",
    },
  },

  // ── Permissions ─────────────────────────────────────────
  {
    match: "Only owners can",
    result: {
      title: "Permission denied",
      description: "Only the owner can perform this action.",
    },
  },

  // ── Not found ───────────────────────────────────────────
  {
    match: "not found",
    result: {
      title: "Not found",
      description: "The record could not be found.",
    },
  },

  // ── Duplicates ──────────────────────────────────────────
  {
    match: "already exists",
    result: {
      title: "Duplicate entry",
      description: "A record with this information already exists.",
    },
  },

  // ── Batch void ──────────────────────────────────────────
  {
    match: "cannot void a batch that has been used in dispatches",
    result: {
      title: "Cannot void",
      description:
        "This batch has been used in dispatches and cannot be voided.",
    },
  },
  {
    match: "Cannot update a voided batch",
    result: {
      title: "Cannot update",
      description: "This batch has been voided and cannot be updated.",
    },
  },
  {
    match: "Only active batches can be voided",
    result: {
      title: "Cannot void",
      description: "Only active batches can be voided.",
    },
  },
  {
    match: "Cannot change quantity or cost",
    result: {
      title: "Cannot modify",
      description:
        "This batch has dispatch or adjustment history and cannot be modified.",
    },
  },
  {
    match: "Cannot change product for batch",
    result: {
      title: "Cannot modify",
      description: "The product for this batch cannot be changed.",
    },
  },

  // ── Stock / inventory ───────────────────────────────────
  {
    match: "Insufficient stock for",
    result: (message: string) => ({
      title: "Insufficient stock",
      description: message,
    }),
  },

  // ── Dispatch ────────────────────────────────────────────
  {
    match: "Sacks can only be dispatched",
    result: {
      title: "Invalid quantity",
      description: "Sacks can only be dispatched in whole units.",
    },
  },

  // ── Archive / status ────────────────────────────────────
  {
    match: "Cannot stock into an archived product",
    result: {
      title: "Product archived",
      description: "This product has been archived and cannot be stocked into.",
    },
  },
  {
    match: "active batch",
    result: {
      title: "Cannot archive",
      description:
        "This supplier has existing batch records. Reassign or delete batches before archiving.",
    },
  },
  {
    match: "Supplier is not archived",
    result: {
      title: "Cannot restore",
      description: "This supplier is not archived.",
    },
  },
  {
    match: "Supplier is already archived",
    result: {
      title: "Cannot archive",
      description: "This supplier is already archived.",
    },
  },
  {
    match: "archived",
    result: {
      title: "Cannot modify",
      description: "This record has been archived and cannot be modified.",
    },
  },

  // ── Weight / unit config ────────────────────────────────
  {
    match: "weight-per-unit",
    result: {
      title: "Configuration error",
      description:
        "Cannot dispatch in kilograms — weight per unit is not configured for this product.",
    },
  },

  // ── Users ───────────────────────────────────────────────
  {
    match: "You cannot deactivate yourself",
    result: {
      title: "Cannot deactivate",
      description: "You cannot deactivate your own account.",
    },
  },
  {
    match: "Can only deactivate staff users",
    result: {
      title: "Cannot deactivate",
      description: "Only staff users can be deactivated.",
    },
  },

  // ── Product creation ────────────────────────────────────
  {
    match: "required for new products",
    result: {
      title: "Missing fields",
      description:
        "Name, category, and base UOM are required when creating a new product.",
    },
  },

  // ── SKU generation ──────────────────────────────────────
  {
    match: "SKU code after",
    result: {
      title: "SKU generation failed",
      description: "Failed to generate a unique SKU code. Please try again.",
    },
  },

  // ── Batch code generation ───────────────────────────────
  {
    match: "batch code after",
    result: {
      title: "Code generation failed",
      description: "Failed to generate a unique batch code. Please try again.",
    },
  },

  // ── Upload ──────────────────────────────────────────────
  {
    match: "Failed to retrieve uploaded image",
    result: {
      title: "Upload error",
      description:
        "The uploaded image could not be retrieved. Please try uploading again.",
    },
  },

  // ── Supplier requires product category ──────────────────
  {
    match: "requires a supplier",
    result: {
      title: "Supplier required",
      description: "This product requires a supplier. Please select one.",
    },
  },

  // ── Product ID required for existing mode ───────────────
  {
    match: "Product ID is required for existing mode",
    result: {
      title: "Invalid selection",
      description: "Please select an existing product to stock into.",
    },
  },
]

function findMatch(message: string): ErrorResult | null {
  for (const pattern of errorPatterns) {
    if (message.toLowerCase().includes(pattern.match.toLowerCase())) {
      if (typeof pattern.result === "function") {
        return pattern.result(message)
      }
      return pattern.result
    }
  }
  return null
}

export function handleConvexError(err: unknown, context: string): ErrorResult {
  if (isRateLimitError(err)) {
    return {
      title: "Too many requests",
      description: `Please wait ${Math.ceil(err.data.retryAfter / 1000)} seconds before trying again.`,
    }
  }

  const message =
    err instanceof Error ? err.message : "An unexpected error occurred."

  const matched = findMatch(message)
  if (matched) return matched

  return {
    title: context,
    description: "Something went wrong. Please try again.",
  }
}
