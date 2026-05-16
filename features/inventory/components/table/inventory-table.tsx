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
import { ArrowDown, ArrowUp } from "lucide-react"
import { Fragment, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
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
            <div className="flex items-center justify-center text-xs font-medium rounded-lg size-8 bg-muted text-muted-foreground shrink-0">
              {info
                .getValue()
                .split(" ")
                .map((w: string) => w[0])
                .slice(0, 2)
                .join("")}
            </div>
            <span className="font-medium">{info.getValue()}</span>
          </div>
        ),
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("skuCode", {
        header: "SKU",
        cell: (info) => (
          <span className="font-mono text-sm text-muted-foreground">
            {info.getValue()}
          </span>
        ),
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
          <span className="tabular-nums">
            {info.getValue().toLocaleString()}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("totalAssetValue", {
        header: "Asset Value",
        cell: (info) => (
          <span className="tabular-nums">
            {formatCurrency(info.getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ row }) => {
          const p = row.original
          const isLowStock =
            p.status === "active" && p.currentQuantity <= p.lowStockThreshold
          return (
            <div className="flex items-center gap-2">
              <Badge
                variant={p.status === "active" ? "default" : "secondary"}
                className="capitalize"
              >
                {p.status}
              </Badge>
              {isLowStock ? (
                <Badge
                  variant="destructive"
                  className="text-[10px] px-1.5 py-0"
                >
                  Low
                </Badge>
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
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row._id,
  })

  const rows = table.getRowModel().rows
  const totalColumns = table.getAllLeafColumns().length

  const toggleExpand = (productId: string) => {
    setExpandedProductId((prev) => (prev === productId ? null : productId))
  }

  return (
    <div className="border rounded-xl">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
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
                        <ArrowUp size={14} className="text-muted-foreground" />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <ArrowDown
                          size={14}
                          className="text-muted-foreground"
                        />
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
          {rows.length ? (
            rows.map((row) => (
              <Fragment key={row.id}>
                <InventoryTableRow
                  row={row}
                  isExpanded={expandedProductId === row.original._id}
                  onToggle={() => toggleExpand(row.original._id)}
                />
                {expandedProductId === row.original._id && (
                  <TableRow
                    key={`${row.id}-batches`}
                    className="hover:bg-transparent"
                  >
                    <TableCell
                      colSpan={totalColumns}
                      className="p-0 border-b-0"
                    >
                      <div
                        className={cn(
                          "border-t border-border overflow-hidden transition-all",
                          "bg-muted/10"
                        )}
                      >
                        <BatchDetailsRow productId={row.original._id} />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={totalColumns}
                className="h-48 text-center text-muted-foreground"
              >
                {search
                  ? "No products match your search."
                  : "No products yet. Add your first inventory to get started."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
