"use client"

import { CaretDownIcon } from "@phosphor-icons/react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/formatters"
import { cn, getInitials } from "@/lib/utils"
import type { Product } from "../../validation"
import InventoryTable from "./inventory-table"
import ProductTableActions from "./product-table-actions"

const columnHelper = createColumnHelper<Product>()

interface InventoryTableContainerProps {
  products: Product[]
  columnVisibility: VisibilityState
  onColumnVisibilityChange: Dispatch<SetStateAction<VisibilityState>>
  batchColumnVisibility: VisibilityState
  onBatchColumnVisibilityChange: Dispatch<SetStateAction<VisibilityState>>
}

export default function InventoryTableContainer({
  products,
  columnVisibility,
  onColumnVisibilityChange,
  batchColumnVisibility,
  onBatchColumnVisibilityChange,
}: InventoryTableContainerProps) {
  const [expandedProductId, setExpandedProductId] = useState<string | null>(
    null
  )
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ])

  const data = useMemo(() => products ?? [], [products])

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Product Name",
        size: 250,
        minSize: 150,
        cell: (info) => (
          <div className="flex items-center gap-2 min-w-0">
            <CaretDownIcon
              weight="fill"
              size={16}
              className={cn(
                "text-muted-foreground transition-all duration-200 shrink-0",
                (
                  info.table.options.meta as {
                    expandedProductId: string | null
                  }
                )?.expandedProductId === info.row.original._id && "rotate-180"
              )}
            />
            <Avatar className="border rounded shrink-0">
              <AvatarImage src={info.row.original.imageUrl ?? ""} />
              <AvatarFallback>{getInitials(info.getValue())}</AvatarFallback>
            </Avatar>
            <span className="font-medium type-body-small line-clamp-2 min-w-0">
              {info.getValue()}
            </span>
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
          <span className="block w-full text-right font-mono tabular-nums">
            {formatNumber(info.getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("totalAssetValue", {
        header: "Asset Value",
        cell: (info) => (
          <span className="block w-full text-right font-mono tabular-nums">
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
              {p.status === "active" ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className="rounded-full size-2 bg-emerald-500 animate-pulse" />
                    }
                  ></TooltipTrigger>
                  <TooltipContent>Product is active</TooltipContent>
                </Tooltip>
              ) : p.status === "archived" ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className="rounded-full size-2 bg-amber-500 animate-pulse" />
                    }
                  ></TooltipTrigger>
                  <TooltipContent>Product is archived</TooltipContent>
                </Tooltip>
              ) : null}
              {!isLowStock && !noStock ? (
                <Badge variant="success">Good</Badge>
              ) : null}
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
    meta: { expandedProductId },
    onSortingChange: setSorting,
    onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    enableSortingRemoval: false,
    isMultiSortEvent: () => false,
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row._id,
  })

  const toggleExpand = (productId: string) => {
    setExpandedProductId((prev) => (prev === productId ? null : productId))
  }

  return (
    <InventoryTable
      table={table}
      expandedProductId={expandedProductId}
      onToggle={toggleExpand}
      batchColumnVisibility={batchColumnVisibility}
      onBatchColumnVisibilityChange={onBatchColumnVisibilityChange}
    />
  )
}
