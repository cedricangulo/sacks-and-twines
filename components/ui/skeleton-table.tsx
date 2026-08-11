import { CaretDownIcon, DotsThreeVerticalIcon } from "@phosphor-icons/react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

// Cell shape hints used to render skeletons that mirror each column's real content.
export type SkeletonCellType =
  | "text"
  | "name"
  | "expand"
  | "mono"
  | "badge"
  | "number"
  | "currency"
  | "date"

// A table column with an optional cell-shape hint for the loading skeleton.
export interface SkeletonColumn {
  label: string
  type?: SkeletonCellType
}

interface SkeletonCellProps {
  type?: SkeletonCellType
  className?: string
}

// Renders a placeholder block that matches the real cell's shape for a column type.
export function SkeletonCell({ type = "text", className }: SkeletonCellProps) {
  switch (type) {
    case "name":
      return (
        <div className="flex items-center gap-2 min-w-0">
          <CaretDownIcon
            weight="fill"
            size={16}
            className="shrink-0 text-muted-foreground"
          />
          <Skeleton className="h-10 w-10 shrink-0 rounded-sm" />
          <Skeleton className={cn("h-5 w-32", className)} />
        </div>
      )
    case "expand":
      return (
        <CaretDownIcon
          weight="fill"
          size={16}
          className="text-muted-foreground"
        />
      )
    case "badge":
      return <Skeleton className={cn("h-5 w-16 rounded-3xl", className)} />
    case "mono":
      return <Skeleton className={cn("h-5 w-16", className)} />
    case "number":
      return (
        <div className="flex w-full justify-end">
          <Skeleton className={cn("h-5 w-12", className)} />
        </div>
      )
    case "currency":
      return (
        <div className="flex w-full justify-end">
          <Skeleton className={cn("h-5 w-20", className)} />
        </div>
      )
    case "date":
      return <Skeleton className={cn("h-5 w-28", className)} />
    default:
      return <Skeleton className={cn("h-5 w-20", className)} />
  }
}

interface SkeletonTableProps {
  columns: SkeletonColumn[]
  actions?: "ellipsis" | "text" | "none"
  rowCount?: number
}

export default function SkeletonTable({
  columns,
  actions = "ellipsis",
  rowCount = 5,
}: SkeletonTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/70">
          {columns.map((column) => (
            <TableHead key={column.label} className="text-muted-foreground">
              {column.label}
            </TableHead>
          ))}
          {actions !== "none" ? (
            <TableHead className="text-muted-foreground" />
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rowCount }).map((_, i) => (
          <TableRow
            key={i}
            className="border-border/25"
            style={{ opacity: Math.max(1 - i * 0.2, 0.3) }}
          >
            {columns.map((column) => (
              <TableCell key={column.label}>
                <SkeletonCell type={column.type} />
              </TableCell>
            ))}
            {actions === "ellipsis" ? (
              <TableCell>
                <DotsThreeVerticalIcon
                  weight="bold"
                  size={16}
                  className="text-muted-foreground"
                />
              </TableCell>
            ) : actions === "text" ? (
              <TableCell>
                <Skeleton className="h-5 w-16" />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
