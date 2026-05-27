"use client"

import { SearchIcon, UploadIcon, XIcon } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatAction } from "@/features/audit-logs/helpers/format-action"
import { DATE_PRESETS } from "../constants"
import { useAuditLogExport } from "../hooks/use-audit-log-export"
import type { AuditLogFilters } from "../hooks/use-audit-logs"

/** Props for the audit log filter bar. */
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

/** Search, action type, date preset, and export controls for the audit log list. */
export default function AuditLogFilterBar({
  search,
  action,
  dateFrom,
  disabled,
  filterArgs,
  hasActiveFilters,
  onClear,
  onSearchChange,
  onDatePresetChange,
  onFilterChange,
}: AuditLogFilterBarProps) {
  const {
    actions,
    isExporting,
    exportDialogOpen,
    exportMenuOpen,
    exportResult,
    recordCount,
    summaryLines,
    handleFormatSelect,
    handleExportConfirm,
    setExportMenuOpen,
    setExportDialogOpen,
  } = useAuditLogExport(search, filterArgs)

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
        onValueChange={(v) => onFilterChange({ action: v })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All Actions" />
        </SelectTrigger>
        {actions !== undefined && (
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>
                {formatAction(a)}
              </SelectItem>
            ))}
          </SelectContent>
        )}
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

      <DropdownMenu open={exportMenuOpen} onOpenChange={setExportMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            disabled={isExporting || !exportResult || disabled}
          >
            <UploadIcon className="text-muted-foreground" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleFormatSelect("csv")}>
            CSV <Kbd>.csv</Kbd>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleFormatSelect("json")}>
            JSON <Kbd>.json</Kbd>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-muted text-muted-foreground">
              <UploadIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Export Audit Logs</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <div className="mb-3">
                  Export {recordCount} audit log entr
                  {recordCount === 1 ? "y" : "ies"} matching your current
                  filters:
                </div>
                <div className="space-y-1 text-left">
                  {summaryLines.map((line) => (
                    <div key={line}>• {line}</div>
                  ))}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExportConfirm}>
              Export
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {hasActiveFilters ? (
        <Button type="button" variant="ghost" onClick={onClear}>
          <XIcon />
          Clear
        </Button>
      ) : null}
    </div>
  )
}
