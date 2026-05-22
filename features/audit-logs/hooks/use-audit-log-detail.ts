"use client"

import { useQuery } from "convex-helpers/react/cache"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { AuditLogEntry } from "./use-audit-logs"

type AuditLogDetail =
  | (AuditLogEntry & {
      userEmail?: string | null
      userRole?: string | null
    })
  | null
  | undefined

export function useAuditLogDetail(
  logId: Id<"auditLogs">,
  enabled: boolean
): AuditLogDetail {
  return useQuery(
    api.auditLogs.queries.getById,
    enabled ? { logId } : "skip"
  ) as AuditLogDetail
}
