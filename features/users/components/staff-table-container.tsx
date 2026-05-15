"use client"

import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "../helpers/format-date"
import StaffTable, { type StaffUser } from "./staff-table"
import StaffTableActions from "./staff-table-actions"

type StaffTableContainerProps = {
  staff: StaffUser[]
  search: string
}

const columnHelper = createColumnHelper<StaffUser>()

export default function StaffTableContainer({
  staff,
  search,
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
              row.original.status === "active" ? "default" : "destructive"
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
        enableGlobalFilter: false,
        sortingFn: "basic",
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => <StaffTableActions user={row.original} />,
        enableSorting: false,
        enableGlobalFilter: false,
      }),
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter: search, sorting },
    onSortingChange: setSorting,
    globalFilterFn: "includesString",
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row._id,
  })

  return <StaffTable table={table} />
}
