"use client"

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, PackageOpen, SearchX } from "lucide-react"
import { Fragment, useMemo, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn, getInitials } from "@/lib/utils"
import type { Product } from "../../validation"
import BatchDetailsRow from "./batch-details-row"
import InventoryTableRow from "./inventory-table-row"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value)

const columnHelper = createColumnHelper<Product>()

interface InventoryTableProps {
  products: Product[]
  search: string
}

export default function InventoryTable({
  products,
  search,
}: InventoryTableProps) {
  const [expandedProductId, setExpandedProductId] = useState<string | null>(
    null
  )
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ])

  const data = useMemo(() => products ?? [], [products])

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "expand",
        header: "",
        enableSorting: false,
        enableGlobalFilter: false,
      }),
      columnHelper.accessor("name", {
        header: "Product Name",
        cell: (info) => (
          <div className="flex items-center gap-2">
            <Avatar className="rounded border">
              <AvatarImage src={info.row.original.imageUrl ?? ""} />
              <AvatarFallback>{getInitials(info.getValue())}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{info.getValue()}</span>
          </div>
        ),
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("skuCode", {
        header: "SKU",
        cell: (info) => <span className="font-mono">{info.getValue()}</span>,
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("category", {
        header: "Category",
        cell: (info) => (
          <Badge variant="secondary" className="capitalize">
            {info.getValue()}
          </Badge>
        ),
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("baseUom", {
        header: "Unit",
        cell: (info) => info.getValue(),
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("currentQuantity", {
        header: "Stock",
        cell: (info) => (
          <span className="font-mono tabular-nums">
            {info.getValue().toLocaleString()}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("totalAssetValue", {
        header: "Asset Value",
        cell: (info) => (
          <span className="font-mono tabular-nums">
            {formatCurrency(info.getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ row }) => {
          const p = row.original
          const noStock = p.status === "active" && p.currentQuantity === 0
          const isLowStock =
            p.status === "active" && p.currentQuantity <= p.lowStockThreshold
          return (
            <div className="flex items-center gap-2">
              <Badge
                variant={p.status === "active" ? "success" : "secondary"}
                className="capitalize"
              >
                {p.status}
              </Badge>
              {isLowStock && !noStock ? (
                <Badge variant="warning">Low</Badge>
              ) : null}
              {noStock ? (
                <Badge variant="destructive">Out of Stock</Badge>
              ) : null}
            </div>
          )
        },
        sortingFn: "alphanumeric",
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
  const totalColumns = table.getAllLeafColumns().length

  const toggleExpand = (productId: string) => {
    setExpandedProductId((prev) => (prev === productId ? null : productId))
  }

  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {search ? <SearchX size={16} /> : <PackageOpen size={16} />}
          </EmptyMedia>
          <EmptyTitle>
            {search ? "No products match your search" : "No products yet"}
          </EmptyTitle>
          <EmptyDescription>
            {search
              ? "Try adjusting your search terms."
              : "Add your first inventory to get started."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id} className="text-muted-foreground">
                {header.isPlaceholder ? null : header.column.getCanSort() ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {header.column.getIsSorted() === "asc" ? (
                      <ArrowUp size={14} aria-hidden="true" />
                    ) : header.column.getIsSorted() === "desc" ? (
                      <ArrowDown size={14} aria-hidden="true" />
                    ) : null}
                  </button>
                ) : (
                  flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <Fragment key={row.id}>
            <InventoryTableRow
              row={row}
              isExpanded={expandedProductId === row.original._id}
              onToggle={() => toggleExpand(row.original._id)}
            />
            {expandedProductId === row.original._id ? (
              <TableRow
                key={`${row.id}-batches`}
                className="hover:bg-transparent"
              >
                <TableCell colSpan={totalColumns} className="p-4">
                  <div className="overflow-hidden transition-all">
                    <BatchDetailsRow productId={row.original._id} />
                  </div>
                </TableCell>
              </TableRow>
            ) : null}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  )
}
