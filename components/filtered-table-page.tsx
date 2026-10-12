"use client"

import type { ReactNode } from "react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import type { FilteredTableState } from "./filtered-table-state"

interface FilteredTablePageProps {
  className?: string
  filterBar: ReactNode
  state: FilteredTableState
  skeleton: ReactNode
  table: ReactNode
  empty: ReactNode
  footer?: ReactNode
}

// Shared filter-bar + loading/permission/table/empty cascade used by table
// pages. Receiving history passes its pagination as `footer`.
export function FilteredTablePage({
  className = "flex-1 space-y-4",
  filterBar,
  state,
  skeleton,
  table,
  empty,
  footer,
}: FilteredTablePageProps) {
  return (
    <div className={className}>
      {filterBar}
      {state === "loading" ? (
        skeleton
      ) : state === "forbidden" ? (
        <p className="type-body-small text-muted-foreground">
          You don&apos;t have permission to access this page.
        </p>
      ) : state === "ready" ? (
        table
      ) : (
        empty
      )}
      {footer}
    </div>
  )
}

interface FilteredEmptyStateProps {
  isFiltered: boolean
  filteredIcon: ReactNode
  emptyIcon: ReactNode
  filteredTitle: string
  emptyTitle: string
  filteredDescription: string
  emptyDescription: string
}

// Shared "no rows because of filters" versus "no rows yet" empty state.
export function FilteredEmptyState({
  isFiltered,
  filteredIcon,
  emptyIcon,
  filteredTitle,
  emptyTitle,
  filteredDescription,
  emptyDescription,
}: FilteredEmptyStateProps) {
  return (
    <Empty className="animate-fade-in">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {isFiltered ? filteredIcon : emptyIcon}
        </EmptyMedia>
        <EmptyTitle>{isFiltered ? filteredTitle : emptyTitle}</EmptyTitle>
        <EmptyDescription>
          {isFiltered ? filteredDescription : emptyDescription}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
