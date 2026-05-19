"use client"

import type { VisibilityState } from "@tanstack/react-table"
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { Building2, SearchX } from "lucide-react"
import type { Dispatch, SetStateAction } from "react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import SupplierTable, { type Supplier } from "./supplier-table"
import SupplierTableActions from "./supplier-table-actions"

type SupplierTableContainerProps = {
  suppliers: Supplier[]
  columnVisibility: VisibilityState
  onColumnVisibilityChange: Dispatch<SetStateAction<VisibilityState>>
}

const columnHelper = createColumnHelper<Supplier>()

export default function SupplierTableContainer({
  suppliers,
  columnVisibility,
  onColumnVisibilityChange,
}: SupplierTableContainerProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "companyName", desc: false },
  ])

  const data = useMemo(() => suppliers ?? [], [suppliers])

  const columns = useMemo(
    () => [
      columnHelper.accessor("companyName", {
        header: "Company Name",
        cell: (info) => info.getValue(),
        sortingFn: "alphanumeric",
        enableHiding: false,
      }),
      columnHelper.accessor((row) => row.contactPerson ?? "", {
        id: "contactPerson",
        header: "Contact Person",
        cell: (info) => info.getValue() || "—",
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor((row) => row.contactNumber ?? "", {
        id: "contactNumber",
        header: "Contact Number",
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor((row) => row.address ?? "", {
        id: "address",
        header: "Address",
        cell: (info) => info.getValue() || "—",
      }),
      columnHelper.accessor((row) => row.archivedAt ?? "", {
        id: "archivedAt",
        header: "Status",
        cell: (info) =>
          info.getValue() ? (
            <Badge variant="warning">Archived</Badge>
          ) : (
            <Badge variant="success">Active</Badge>
          ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => <SupplierTableActions supplier={row.original} />,
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

  const rows = table.getRowModel().rows

  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building2 size={16} />
          </EmptyMedia>
          <EmptyTitle>No suppliers yet</EmptyTitle>
          <EmptyDescription>
            Add your first supplier to get started.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return <SupplierTable table={table} />
}
