"use client"

import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react"
import { useQuery } from "convex-helpers/react/cache"
import Link from "next/link"
import type { Dispatch, SetStateAction } from "react"
import ColumnVisibilityMenu from "@/components/column-visibility-menu"
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
import {
  RECEIVING_DATE_RANGES,
  RECEIVING_STATUS_OPTIONS,
  RECEIVING_TABLE_COLUMNS,
  type ReceivingDateRange,
  type ReceivingStatus,
} from "../constants"

interface Props {
  search: string
  onSearchChange: (value: string) => void
  dateRange: ReceivingDateRange
  supplierId: string
  status: ReceivingStatus
  onFilterChange: (
    filters: Partial<{
      dateRange: ReceivingDateRange
      supplierId: string
      status: ReceivingStatus
    }>
  ) => void
  hasActiveFilters: boolean
  onClear: () => void
  columnVisibility: Record<string, boolean>
  onColumnVisibilityChange: Dispatch<SetStateAction<Record<string, boolean>>>
}

// Filters and column visibility controls for the receiving history page.
export default function ReceivingFilterBar({
  search,
  onSearchChange,
  dateRange,
  supplierId,
  status,
  onFilterChange,
  hasActiveFilters,
  onClear,
  columnVisibility,
  onColumnVisibilityChange,
}: Props) {
  const { isAuthenticated } = useCurrentUser()

  const suppliers = useQuery(
    api.suppliers.queries.listActiveOptions,
    isAuthenticated ? {} : "skip"
  )

  // `onSearchChange` writes to the URL through nuqs, which debounces the URL
  // update itself, so the input can stay bound to `search` directly.

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        aria-label="Back to inventory"
        size="icon"
        variant="ghost"
        nativeButton={false}
        render={<Link href="/inventory" transitionTypes={["nav-back"]} />}
      >
        <ArrowLeftIcon weight="fill" />
      </Button>

      <div className="relative min-w-0 max-w-xs grow">
        <MagnifyingGlassIcon
          weight="bold"
          className="absolute -translate-y-1/2 left-3 top-1/2 size-4 text-muted-foreground"
        />
        <Input
          placeholder="Search this page by batch, product or supplier..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select
        value={dateRange}
        onValueChange={(v) =>
          v != null && onFilterChange({ dateRange: v as ReceivingDateRange })
        }
      >
        <SelectTrigger className="w-36">
          <CalendarBlankIcon
            weight="bold"
            className="size-4 text-muted-foreground"
          />
          <SelectValue>
            {RECEIVING_DATE_RANGES.find((o) => o.value === dateRange)?.label ??
              dateRange}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {RECEIVING_DATE_RANGES.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={supplierId}
        onValueChange={(v) => v != null && onFilterChange({ supplierId: v })}
      >
        <SelectTrigger className="w-40">
          <SelectValue>
            {supplierId === "all"
              ? "All Suppliers"
              : ((suppliers ?? []).find((s) => s._id === supplierId)
                  ?.companyName ?? supplierId)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Suppliers</SelectItem>
          {(suppliers ?? []).map((supplier) => (
            <SelectItem key={supplier._id} value={supplier._id}>
              {supplier.companyName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={status}
        onValueChange={(v) =>
          v != null && onFilterChange({ status: v as ReceivingStatus })
        }
      >
        <SelectTrigger className="w-32">
          <SelectValue>
            {RECEIVING_STATUS_OPTIONS.find((o) => o.value === status)?.label ??
              status}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {RECEIVING_STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ColumnVisibilityMenu
        contentClassName="min-w-48"
        groups={[
          {
            label: "Columns",
            columns: RECEIVING_TABLE_COLUMNS,
            visibility: columnVisibility,
            onVisibilityChange: onColumnVisibilityChange,
          },
        ]}
      />

      {hasActiveFilters ? (
        <Button type="button" variant="ghost" onClick={onClear}>
          <XIcon weight="bold" />
          Clear
        </Button>
      ) : null}
    </div>
  )
}
