"use client"

import type { VisibilityState } from "@tanstack/react-table"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, PackageOpen } from "lucide-react"
import type { Dispatch, SetStateAction } from "react"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/formatters"
import { cn, getInitials } from "@/lib/utils"
import type { Product } from "../../validation"
import BatchDetailsRow from "./batch-details-row"
import InventoryTableRow from "./inventory-table-row"
import ProductTableActions from "./product-table-actions"

const columnHelper = createColumnHelper<Product>()

// Props for the inventory table.
interface InventoryTableProps {
  products: Product[]
  columnVisibility: VisibilityState
  onColumnVisibilityChange: Dispatch<SetStateAction<VisibilityState>>
  batchColumnVisibility: VisibilityState
  onBatchColumnVisibilityChange: Dispatch<SetStateAction<VisibilityState>>
}

// Full inventory table with expandable product rows, batch detail sub-rows, sorting, and column visibility.
export default function InventoryTable({
  products,
  columnVisibility,
  onColumnVisibilityChange,
  batchColumnVisibility,
  onBatchColumnVisibilityChange,
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
        enableHiding: false,
        enableGlobalFilter: false,
      }),
      columnHelper.accessor("name", {
        header: "Product Name",
        cell: (info) => (
          <div className="flex items-center gap-2">
            <Avatar className="border rounded">
              <AvatarImage src={info.row.original.imageUrl ?? ""} />
              <AvatarFallback>{getInitials(info.getValue())}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{info.getValue()}</span>
          </div>
        ),
        sortingFn: "alphanumeric",
        enableHiding: false,
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
            {formatNumber(info.getValue())}
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
      columnHelper.accessor((row) => row.createdAt ?? row._creationTime, {
        id: "createdAt",
        header: "Created",
        cell: (info) => (
          <span className="text-muted-foreground">
            {formatDateTime(info.getValue())}
          </span>
        ),
        enableGlobalFilter: false,
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
              {/* Active Status */}
              {p.status === "active" ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="rounded-full size-2 bg-emerald-500 animate-pulse" />
                  </TooltipTrigger>
                  <TooltipContent>Product is active</TooltipContent>
                </Tooltip>
              ) : p.status === "archived" ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="rounded-full size-2 bg-amber-500 animate-pulse" />
                  </TooltipTrigger>
                  <TooltipContent>Product is archived</TooltipContent>
                </Tooltip>
              ) : null}
              {/* Good Stock Health */}
              {!isLowStock && !noStock ? (
                <Badge variant="success">Good</Badge>
              ) : null}
              {/* Low Stock */}
              {isLowStock && !noStock ? (
                <Badge variant="warning">Low</Badge>
              ) : null}
              {/* Out of Stock */}
              {noStock ? (
                <Badge variant="destructive">Out of Stock</Badge>
              ) : null}
            </div>
          )
        },
        sortingFn: "alphanumeric",
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => <ProductTableActions product={row.original} />,
        enableSorting: false,
        enableHiding: false,
        enableGlobalFilter: false,
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
  const totalColumns = table.getAllLeafColumns().length

  const toggleExpand = (productId: string) => {
    setExpandedProductId((prev) => (prev === productId ? null : productId))
  }

  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageOpen size={16} />
          </EmptyMedia>
          <EmptyTitle>No products yet</EmptyTitle>
          <EmptyDescription>
            Add your first inventory to get started.
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
              <TableRow key={`${row.id}-batches`}>
                <TableCell colSpan={totalColumns} className="p-4">
                  <div className="overflow-hidden transition-all">
                    <BatchDetailsRow
                      productId={row.original._id}
                      columnVisibility={batchColumnVisibility}
                      onColumnVisibilityChange={onBatchColumnVisibilityChange}
                    />
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
