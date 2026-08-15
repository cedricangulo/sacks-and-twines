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
import Image from "next/image"
import type { Dispatch, SetStateAction } from "react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
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
          <div className="flex items-center min-w-0 gap-2">
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
            {info.row.original.imageUrl ? (
              <Image
                alt={info.row.original.name}
                className="object-cover border rounded-sm"
                src={info.row.original.imageUrl}
                width={40}
                height={40}
              />
            ) : (
              <div className="flex items-center justify-center overflow-hidden border rounded-sm size-10">
                <span className="truncate type-body-default text-muted-foreground">
                  {getInitials(info.getValue())}
                </span>
              </div>
            )}
            <span className="min-w-0 font-medium type-body-small line-clamp-2">
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
          <span className="block w-full font-mono text-right tabular-nums">
            {formatNumber(info.getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("totalAssetValue", {
        header: "Asset Value",
        cell: (info) => (
          <span className="block w-full font-mono text-right tabular-nums">
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
          const isArchived = p.status === "archived"
          const noStock = p.currentQuantity === 0
          const isLowStock =
            !noStock && p.currentQuantity <= p.lowStockThreshold
          return (
            <div className="flex items-center gap-2">
              {isArchived ? (
                <Badge variant="secondary">Archived</Badge>
              ) : noStock ? (
                <Badge variant="destructive">Out of Stock</Badge>
              ) : isLowStock ? (
                <Badge variant="warning">Low</Badge>
              ) : (
                <Badge variant="success">Good</Badge>
              )}
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
