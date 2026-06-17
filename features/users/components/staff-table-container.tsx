"use client"

import type { VisibilityState } from "@tanstack/react-table"
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import type { Dispatch, SetStateAction } from "react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "../helpers/format-date"
import StaffTable, { type StaffUser } from "./staff-table"
import StaffTableActions from "./staff-table-actions"

// Props for the staff table container.
type StaffTableContainerProps = {
  staff: StaffUser[]
  columnVisibility: VisibilityState
  onColumnVisibilityChange: Dispatch<SetStateAction<VisibilityState>>
}

const columnHelper = createColumnHelper<StaffUser>()

// Full staff table with columns definition, sorting, column visibility, and empty state.
export default function StaffTableContainer({
  staff,
  columnVisibility,
  onColumnVisibilityChange,
}: StaffTableContainerProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created", desc: true },
  ])

  const data = useMemo(() => staff ?? [], [staff])

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.name ?? "", {
        id: "name",
        header: "Name",
        cell: (info) => info.getValue() || "—",
        sortingFn: "alphanumeric",
        enableHiding: false,
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => info.getValue(),
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor((row) => row.status ?? "", {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "active" ? "success" : "destructive"
            }
          >
            {row.original.status === "active" ? "Active" : "Deactivated"}
          </Badge>
        ),
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor((row) => row._creationTime, {
        id: "created",
        header: "Created",
        cell: ({ row }) => formatDate(row.original._creationTime),
        sortingFn: "basic",
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => <StaffTableActions user={row.original} />,
        enableSorting: false,
        enableHiding: false,
      }),
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    enableSortingRemoval: false,
    isMultiSortEvent: () => false,
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row._id,
  })

  return <StaffTable table={table} />
}
