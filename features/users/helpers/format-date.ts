import { formatDate as sharedFormatDate } from "@/lib/formatters"

// Re-exports the shared date formatter for the users feature.
export const formatDate = (timestamp: number) => sharedFormatDate(timestamp)
