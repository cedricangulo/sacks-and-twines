"use client"

import { Loader2Icon } from "lucide-react"
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/formatters"
import { FIELD_LABELS } from "../constants"
import { formatRelativeTime } from "../helpers/format-relative-time"
import {
  formatChangeLabel,
  parseDescription,
} from "../helpers/parse-description"
import { useAuditLogDetail } from "../hooks/use-audit-log-detail"
import type { AuditLogEntry } from "../hooks/use-audit-logs"

interface AuditLogItemProps {
  log: AuditLogEntry
  isExpanded: boolean
}

export default function AuditLogItem({ log, isExpanded }: AuditLogItemProps) {
  const detail = useAuditLogDetail(log._id, isExpanded)
  const isLoading = isExpanded && detail === undefined

  const displayName = log.userName ?? "Unknown"
  const relativeTime = formatRelativeTime(log._creationTime)
  const formattedTimestamp = formatDateTime(log._creationTime)

  const parsedDesc = parseDescription(log.description)

  return (
    <AccordionItem value={log._id}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline gap-2">
            <span className="font-medium truncate type-sm">{displayName}</span>
            <Badge variant="outline">{log.action}</Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="type-sm shrink-0 text-muted-foreground">
              {relativeTime}
            </span>
            <span className="text-muted-foreground type-sm">|</span>
            <span className="type-sm truncate w-full text-muted-foreground">
              {parsedDesc.summary}
            </span>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="h-full border-t pt-2.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2Icon className="mr-2 animate-spin" />
            Loading details&hellip;
          </div>
        ) : (
          detail && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 type-sm">
              <DetailRow
                label={FIELD_LABELS.timestamp}
                value={formattedTimestamp}
              />
              <DetailRow label={FIELD_LABELS.action} value={detail.action} />
              <DetailRow
                label={FIELD_LABELS.userName}
                value={detail.userName ?? "—"}
              />
              <DetailRow
                label={FIELD_LABELS.userId}
                value={detail.userId ?? "—"}
              />
              <DetailRow
                label={FIELD_LABELS.userEmail}
                value={detail.userEmail ?? "—"}
              />
              <DetailRow
                label={FIELD_LABELS.userRole}
                value={detail.userRole ?? "—"}
              />
              <DetailRow
                label={FIELD_LABELS.resourceType}
                value={detail.resourceType ?? "—"}
              />
              <DetailRow
                label={FIELD_LABELS.resourceId}
                value={detail.resourceId ?? "—"}
              />
              {parsedDesc.isFlat ? (
                parsedDesc.details &&
                Object.keys(parsedDesc.details).length > 0 &&
                Object.entries(parsedDesc.details).map(([key, value]) => (
                  <DetailRow key={key} label={key} value={String(value)} />
                ))
              ) : (
                <>
                  {parsedDesc.details &&
                    Object.keys(parsedDesc.details).length > 0 && (
                      <>
                        <dt className="text-muted-foreground">
                          {FIELD_LABELS.details}
                        </dt>
                        <dd>
                          <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
                            {Object.entries(parsedDesc.details).map(
                              ([key, value]) => (
                                <GroupedField
                                  key={key}
                                  label={key}
                                  value={String(value)}
                                />
                              )
                            )}
                          </div>
                        </dd>
                      </>
                    )}
                  {parsedDesc.changes &&
                    Object.keys(parsedDesc.changes).length > 0 && (
                      <>
                        <dt className="text-muted-foreground">
                          {FIELD_LABELS.changes}
                        </dt>
                        <dd>
                          <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
                            {Object.entries(parsedDesc.changes).map(
                              ([key, change]: [
                                string,
                                { old: unknown; new: unknown },
                              ]) => (
                                <ChangeEntry
                                  key={key}
                                  label={formatChangeLabel(key)}
                                  oldVal={String(change.old)}
                                  newVal={String(change.new)}
                                />
                              )
                            )}
                          </div>
                        </dd>
                      </>
                    )}
                </>
              )}
              <DetailRow
                label={FIELD_LABELS.ipAddress}
                value={detail.ipAddress ?? "—"}
              />
              <DetailRow
                label={FIELD_LABELS.userAgent}
                value={detail.userAgent ?? "—"}
              />
            </dl>
          )
        )}
      </AccordionContent>
    </AccordionItem>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono truncate text-foreground">{value}</dd>
    </>
  )
}

function GroupedField({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </>
  )
}

function ChangeEntry({
  label,
  oldVal,
  newVal,
}: {
  label: string
  oldVal: string
  newVal: string
}) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">
        <span className="text-destructive line-through">{oldVal}</span>
        <span> → </span>
        <span className="text-emerald-500">{newVal}</span>
      </span>
    </>
  )
}
