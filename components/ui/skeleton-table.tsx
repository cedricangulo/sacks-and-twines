import { DotsThreeVerticalIcon } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface SkeletonTableProps {
  headers: string[]
  actions?: "ellipsis" | "text" | "none"
  rowCount?: number
}

export default function SkeletonTable({
  headers,
  actions = "ellipsis",
  rowCount = 5,
}: SkeletonTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/70">
          {headers.map((header) => (
            <TableHead key={header} className="text-muted-foreground">
              {header}
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
            className="border-border/25"
            key={i}
            style={{ opacity: Math.max(1 - i * 0.2, 0.3) }}
          >
            {headers.map((header) => (
              <TableCell className="h-15" key={header}>
                <Skeleton className="w-20 h-4" />
              </TableCell>
            ))}
            {actions === "ellipsis" ? (
              <TableCell>
                <DotsThreeVerticalIcon weight="bold" size={16} className="text-muted-foreground" />
              </TableCell>
            ) : actions === "text" ? (
              <TableCell>
                <Skeleton className="w-16 h-4" />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
