"use client"

import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { SearchX, Users } from "lucide-react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
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
    enableSortingRemoval: false,
    isMultiSortEvent: () => false,
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row._id,
  })

  const rows = table.getRowModel().rows

  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {search ? <SearchX size={16} /> : <Users size={16} />}
          </EmptyMedia>
          <EmptyTitle>
            {search ? "No staff match your search" : "No staff yet"}
          </EmptyTitle>
          <EmptyDescription>
            {search
              ? "Try adjusting your search terms."
              : "Create your first staff account to get started."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return <StaffTable table={table} />
}
