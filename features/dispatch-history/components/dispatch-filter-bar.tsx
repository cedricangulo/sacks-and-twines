"use client"

import {
  ArrowLeftIcon,
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
  DISPATCH_TABLE_COLUMNS,
  ITEMS_TABLE_COLUMNS,
  STATUS_OPTIONS,
} from "../constants"

interface Props {
  search: string
  onSearchChange: (value: string) => void
  status: "all" | "completed" | "voided"
  createdByUserId: string
  onFilterChange: (
    filters: Partial<{
      status: "all" | "completed" | "voided"
      createdByUserId: string
    }>
  ) => void
  hasActiveFilters: boolean
  onClear: () => void
  dispatchVisibility: Record<string, boolean>
  onDispatchVisibilityChange: Dispatch<SetStateAction<Record<string, boolean>>>
  itemsVisibility: Record<string, boolean>
  onItemsVisibilityChange: Dispatch<SetStateAction<Record<string, boolean>>>
}

// Filters and column visibility controls for the dispatch history page.
export default function DispatchFilterBar({
  search,
  onSearchChange,
  status,
  createdByUserId,
  onFilterChange,
  hasActiveFilters,
  onClear,
  dispatchVisibility,
  onDispatchVisibilityChange,
  itemsVisibility,
  onItemsVisibilityChange,
}: Props) {
  const { isAuthenticated } = useCurrentUser()

  const users = useQuery(
    api.users.queries.listNames,
    isAuthenticated ? {} : "skip"
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        aria-label="Back to products"
        size="icon"
        variant="ghost"
        nativeButton={false}
        render={<Link href="/products" transitionTypes={["nav-back"]} />}
      >
        <ArrowLeftIcon weight="fill" />
      </Button>
      <div className="relative max-w-xs grow">
        <MagnifyingGlassIcon
          weight="bold"
          className="absolute -translate-y-1/2 left-3 top-1/2 size-4 text-muted-foreground"
        />
        <Input
          placeholder="Search by customer or user..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select
        value={status}
        onValueChange={(v) =>
          onFilterChange({
            status: v as "all" | "completed" | "voided",
          })
        }
      >
        <SelectTrigger className="w-34">
          <SelectValue>
            {STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={createdByUserId}
        onValueChange={(v) =>
          v != null && onFilterChange({ createdByUserId: v })
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue>
            {createdByUserId === "all"
              ? "All Users"
              : ((users ?? []).find((u) => u._id === createdByUserId)?.name ??
                createdByUserId)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Users</SelectItem>
          {(users ?? []).map((user) => (
            <SelectItem key={user._id} value={user._id}>
              {user.name ?? "Unknown"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ColumnVisibilityMenu
        groups={[
          {
            label: "Dispatch Table",
            columns: DISPATCH_TABLE_COLUMNS,
            visibility: dispatchVisibility,
            onVisibilityChange: onDispatchVisibilityChange,
          },
          {
            label: "Items Table",
            columns: ITEMS_TABLE_COLUMNS,
            visibility: itemsVisibility,
            onVisibilityChange: onItemsVisibilityChange,
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
