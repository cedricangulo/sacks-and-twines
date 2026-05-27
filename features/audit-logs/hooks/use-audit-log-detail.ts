"use client"

import { useQuery } from "convex-helpers/react/cache"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"
import type { AuditLogEntry } from "./use-audit-logs"

/** Shape of the audit log detail returned by the hook, including optional user email and role for owners. */
type AuditLogDetail =
  | (AuditLogEntry & {
      userEmail?: string | null
      userRole?: string | null
    })
  | null
  | undefined

/** Fetches a single audit log's detailed fields. Uses the personal or admin query depending on the user's role. */
export function useAuditLogDetail(
  logId: Id<"auditLogs">,
  enabled: boolean
): AuditLogDetail {
  const { user } = useCurrentUser()
  const isStaff = user?.role === "staff"

  return useQuery(
    isStaff
      ? api.auditLogs.queries.getPersonalById
      : api.auditLogs.queries.getById,
    enabled ? { logId } : "skip"
  ) as AuditLogDetail
}
