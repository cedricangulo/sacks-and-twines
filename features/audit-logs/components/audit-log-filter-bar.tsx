"use client"

import { useQuery } from "convex-helpers/react/cache"
import { DownloadIcon, SearchIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/convex/_generated/api"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"
import { DATE_PRESETS } from "../constants"
import type { AuditLogFilters } from "../hooks/use-audit-logs"

interface AuditLogFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  action: string
  dateFrom: string
  disabled?: boolean
  onDatePresetChange: (preset: string) => void
  onFilterChange: (updates: Partial<AuditLogFilters>) => void
  filterArgs: AuditLogFilters
  hasActiveFilters: boolean
  onClear: () => void
}

const formatAction = (action: string) =>
  action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

export default function AuditLogFilterBar({
  search,
  onSearchChange,
  action,
  dateFrom,
  disabled,
  onDatePresetChange,
  onFilterChange,
  filterArgs,
  hasActiveFilters,
  onClear,
}: AuditLogFilterBarProps) {
  const { isAuthenticated } = useCurrentUser()
  const [isExporting, setIsExporting] = useState(false)

  const actions = useQuery(
    api.auditLogs.queries.listActions,
    isAuthenticated ? {} : "skip"
  ) as string[] | undefined

  const csvResult = useQuery(
    api.auditLogs.queries.exportCsv,
    isAuthenticated
      ? {
          action: filterArgs.action,
          userId: filterArgs.userId,
          dateFrom: filterArgs.dateFrom,
          dateTo: filterArgs.dateTo,
        }
      : "skip"
  )

  const handleExport = () => {
    if (!csvResult) return
    setIsExporting(true)
    const blob = new Blob([csvResult], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setTimeout(() => setIsExporting(false), 500)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative max-w-xs grow">
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search logs..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select
        disabled={disabled}
        value={action}
        onValueChange={(v) =>
          onFilterChange({ action: v === "all" ? undefined : v })
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All Actions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Actions</SelectItem>
          {actions?.map((a) => (
            <SelectItem key={a} value={a}>
              {formatAction(a)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        disabled={disabled}
        value={dateFrom}
        onValueChange={(v) => onDatePresetChange(v)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="All Time" />
        </SelectTrigger>
        <SelectContent>
          {DATE_PRESETS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="secondary"
        onClick={handleExport}
        disabled={isExporting || !csvResult || disabled}
      >
        <DownloadIcon className="text-muted-foreground" />
        {isExporting ? "Exporting..." : "Export"}
      </Button>

      {hasActiveFilters ? (
        <Button type="button" variant="ghost" onClick={onClear}>
          <XIcon />
          Clear
        </Button>
      ) : null}
    </div>
  )
}
