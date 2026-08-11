"use client"

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateTime } from "@/lib/formatters"
import { AUDIT_LOG_DETAIL_FIELDS, FIELD_LABELS } from "../constants"
import { formatAction } from "../helpers/format-action"
import { formatRelativeTime } from "../helpers/format-relative-time"
import {
  formatChangeLabel,
  parseDescription,
} from "../helpers/parse-description"
import { useAuditLogDetail } from "../hooks/use-audit-log-detail"
import type { AuditLogEntry } from "../hooks/use-audit-logs"

// Props for the audit log accordion item.
interface AuditLogItemProps {
  log: AuditLogEntry
  isExpanded: boolean
}

// Accordion item showing a single audit log entry with expandable detail panel.
export default function AuditLogItem({ log, isExpanded }: AuditLogItemProps) {
  const detail = useAuditLogDetail(log._id, isExpanded)
  const isLoading = isExpanded && detail === undefined

  const displayName = log.userName ?? "Unknown"
  const logDate = log.createdAt ?? log._creationTime
  const relativeTime = formatRelativeTime(logDate)
  const formattedTimestamp = formatDateTime(logDate)

  const parsedDesc = parseDescription(log.description)

  return (
    <AccordionItem value={log._id}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline gap-2">
            <span className="font-medium truncate type-body-small">
              {displayName}
            </span>
            <Badge variant="outline">{formatAction(log.action)}</Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="type-body-small shrink-0 text-muted-foreground">
              {relativeTime}
            </span>
            <span className="text-muted-foreground type-body-small">|</span>
            <span className="type-body-small truncate w-full text-muted-foreground">
              {parsedDesc.summary}
            </span>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="h-full border-t pt-2.5">
        {isLoading ? (
          <DetailSkeleton parsedDesc={parsedDesc} />
        ) : (
          detail && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 type-body-small">
              <DetailRow
                label={FIELD_LABELS.timestamp}
                value={formattedTimestamp}
              />
              <DetailRow
                label={FIELD_LABELS.action}
                value={formatAction(detail.action)}
              />
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

// Renders a key-value row inside the audit log detail panel.
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono truncate text-foreground">{value}</dd>
    </>
  )
}

// Renders a grouped field label-value pair inside nested detail sections.
function GroupedField({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </>
  )
}

// Fields rendered before the details/changes sections in the detail panel.
const DETAIL_CORE_FIELDS = AUDIT_LOG_DETAIL_FIELDS.slice(0, -2)

// Fields rendered after the details/changes sections in the detail panel.
const DETAIL_TRAILING_FIELDS = AUDIT_LOG_DETAIL_FIELDS.slice(-2)

// Skeleton mirror of the detail panel. Renders the same <dl> grid as the loaded
// state — labels are known, values are placeholder blocks — so the real rows swap
// in place without shifting. Section presence is known synchronously via parsedDesc.
function DetailSkeleton({
  parsedDesc,
}: {
  parsedDesc: ReturnType<typeof parseDescription>
}) {
  const hasDetails =
    parsedDesc.details && Object.keys(parsedDesc.details).length > 0
  const hasChanges =
    parsedDesc.changes && Object.keys(parsedDesc.changes).length > 0

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 type-body-small">
      {DETAIL_CORE_FIELDS.map((field) => (
        <DetailSkeletonRow key={field} label={FIELD_LABELS[field]} />
      ))}
      {parsedDesc.isFlat ? (
        hasDetails &&
        Object.keys(parsedDesc.details!).map((key) => (
          <DetailSkeletonRow key={key} label={key} />
        ))
      ) : (
        <>
          {hasDetails && (
            <>
              <dt className="text-muted-foreground">{FIELD_LABELS.details}</dt>
              <dd>
                <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
                  {Object.keys(parsedDesc.details!).map((key) => (
                    <GroupedSkeletonRow key={key} label={key} />
                  ))}
                </div>
              </dd>
            </>
          )}
          {hasChanges && (
            <>
              <dt className="text-muted-foreground">{FIELD_LABELS.changes}</dt>
              <dd>
                <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
                  {Object.keys(parsedDesc.changes!).map((key) => (
                    <GroupedSkeletonRow
                      key={key}
                      label={formatChangeLabel(key)}
                      valueWidth="w-44"
                    />
                  ))}
                </div>
              </dd>
            </>
          )}
        </>
      )}
      {DETAIL_TRAILING_FIELDS.map((field) => (
        <DetailSkeletonRow key={field} label={FIELD_LABELS[field]} />
      ))}
    </dl>
  )
}

// Skeleton row matching the DetailRow layout: known label text + placeholder value.
function DetailSkeletonRow({
  label,
  valueWidth = "w-40",
}: {
  label: string
  valueWidth?: string
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>
        <Skeleton className={`h-5 ${valueWidth}`} />
      </dd>
    </>
  )
}

// Skeleton row matching the GroupedField layout inside nested sections.
function GroupedSkeletonRow({
  label,
  valueWidth = "w-40",
}: {
  label: string
  valueWidth?: string
}) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">
        <Skeleton className={`h-5 ${valueWidth}`} />
      </span>
    </>
  )
}

// Renders a change entry showing old → new values with strikethrough styling.
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
