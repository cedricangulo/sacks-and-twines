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
import SupplierTable, { type Supplier } from "./supplier-table"
import SupplierTableActions from "./supplier-table-actions"

type SupplierTableContainerProps = {
  suppliers: Supplier[]
  search: string
}

const columnHelper = createColumnHelper<Supplier>()

export default function SupplierTableContainer({
  suppliers,
  search,
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
        enableGlobalFilter: false,
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => <SupplierTableActions supplier={row.original} />,
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

  return <SupplierTable table={table} />
}
