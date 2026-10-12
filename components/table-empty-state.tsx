"use client"

import type { ReactNode } from "react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

interface TableEmptyStateProps {
  icon: ReactNode
  title: string
  description: string
}

// Empty state shared by TanStack tables. The per-table icon and copy stay at
// the call site; only the repeated Empty/Header/Media/Title structure lives
// here.
export default function TableEmptyState({
  icon,
  title,
  description,
}: TableEmptyStateProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
