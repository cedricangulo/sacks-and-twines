"use client"

import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react"
import type { VisibilityState } from "@tanstack/react-table"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { parseAsString, useQueryState } from "nuqs"
import type { Dispatch, ReactNode, SetStateAction } from "react"
import { useMemo, useState } from "react"
import { SortableTableHead } from "@/components/sortable-table-head"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  SkeletonCell,
  type SkeletonCellType,
} from "@/components/ui/skeleton-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Id } from "@/convex/_generated/dataModel"
import { formatCurrency, formatNumber } from "@/lib/formatters"
import { matchesNumber, matchesSearch, normalizeSearchTerm } from "@/lib/search"
import { useDispatchItems } from "../hooks/use-dispatch-items"
import type { DispatchItem } from "../validation"

const columnHelper = createColumnHelper<DispatchItem>()

// Skeleton cell shape per column id so loading rows mirror the real cells.
const SKELETON_BY_COLUMN_ID: Record<string, SkeletonCellType> = {
  productName: "text",
  productSku: "mono",
  batchCode: "mono",
  dispatchQuantity: "mono",
  unitCost: "mono",
  lineTotal: "mono",
}

// Dispatched-items table for a single dispatch, shown in an expandable row with sorting and column toggling.
//
// `columnVisibility` is optional: callers that surface no column-toggling UI
// (e.g. the reports detail panel) omit it and every column stays visible.
export default function DispatchItemsTable({
  dispatchId,
  searchParamKey,
  columnVisibility,
  onColumnVisibilityChange,
}: {
  dispatchId: Id<"dispatches">
  /**
   * URL query key for this table's search box.
   *
   * A prop rather than a fixed key because this table is rendered on two pages
   * (dispatch history and the reports detail panel). A shared key would let a
   * search typed on one page silently filter the other.
   */
  searchParamKey: string
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: Dispatch<SetStateAction<VisibilityState>>
}) {
  const items = useDispatchItems(dispatchId)
  const [sorting, setSorting] = useState<SortingState>([
    { id: "productName", desc: false },
  ])

  const [rawSearch, setSearch] = useQueryState(
    searchParamKey,
    parseAsString.withDefault("").withOptions({ history: "replace" })
  )
  const search = normalizeSearchTerm(rawSearch)

  // Scoped to this dispatch's items, matching how the batch sub-table searches
  // within one product's batches.
  const data = useMemo(() => {
    if (!items) return []
    if (!search) return items
    return items.filter(
      (i) =>
        matchesSearch(i.productName, search) ||
        matchesSearch(i.productSku, search) ||
        matchesSearch(i.batchCode, search) ||
        matchesNumber(i.dispatchQuantity, search) ||
        matchesNumber(i.unitCost, search) ||
        matchesSearch(formatCurrency(i.unitCost), search) ||
        matchesNumber(i.lineTotal, search) ||
        matchesSearch(formatCurrency(i.lineTotal), search)
    )
  }, [items, search])

  const columns = useMemo(
    () => [
      columnHelper.accessor("productName", {
        header: "Product Name",
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("productSku", {
        header: "SKU Code",
        cell: (info) => <span className="font-mono">{info.getValue()}</span>,
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor("batchCode", {
        header: "Batch Code",
        cell: (info) => <span className="font-mono">{info.getValue()}</span>,
        sortingFn: "alphanumeric",
        enableHiding: false,
      }),
      columnHelper.accessor("dispatchQuantity", {
        header: "Qty",
        cell: (info) => {
          const {
            dispatchQuantity,
            dispatchUom,
            baseUom,
            quantityDeducted,
            conversionFactor,
          } = info.row.original

          const fmt = (n: number) =>
            formatNumber(n, {
              locale: "en-PH",
              maximumFractionDigits: 4,
            })

          const quantityLabel = `${fmt(dispatchQuantity)} ${dispatchUom}`
          let detail: string | null = null
          if (dispatchUom !== baseUom && baseUom) {
            detail = `${fmt(quantityDeducted)} ${baseUom}`
          } else if (
            dispatchUom === "piece" &&
            conversionFactor &&
            conversionFactor > 0 &&
            dispatchQuantity % conversionFactor === 0
          ) {
            const packs = dispatchQuantity / conversionFactor
            detail = `${fmt(packs)} ${packs === 1 ? "pack" : "packs"}`
          }

          return (
            <span className="block w-full text-right font-mono tabular-nums">
              {quantityLabel}
              {detail ? (
                <>
                  {" "}
                  <span className="text-muted-foreground">({detail})</span>
                </>
              ) : null}
            </span>
          )
        },
        sortingFn: "basic",
        id: "dispatchQuantity",
        meta: { align: "right" },
      }),
      columnHelper.accessor("unitCost", {
        meta: { align: "right" },
        header: "Unit Cost",
        cell: (info) => (
          <span className="block w-full text-right font-mono tabular-nums">
            {formatCurrency(info.getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor("lineTotal", {
        meta: { align: "right" },
        header: "Line Total",
        cell: (info) => (
          <span className="block w-full text-right font-mono tabular-nums">
            {formatCurrency(info.getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    // `columnVisibility` is undefined when the caller toggles nothing, which
    // leaves visibility uncontrolled (all columns visible).
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

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative max-w-64 grow">
          <MagnifyingGlassIcon
            weight="bold"
            className="absolute -translate-y-1/2 left-3 top-1/2 size-4 text-muted-foreground"
          />
          <Input
            aria-label="Search this dispatch's items"
            placeholder="Search items..."
            value={rawSearch}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-9"
          />
        </div>
        {search ? (
          <Button
            aria-label="Clear item search"
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setSearch("")}
          >
            <XIcon weight="bold" />
            Clear
          </Button>
        ) : null}
      </div>

      <Table>
        <TableHeader className="border-b">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow className="border-border/50" key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <SortableTableHead key={header.id} header={header} />
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="animate-fade-in">
          {items === undefined ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                {table.getAllLeafColumns().reduce<ReactNode[]>((acc, col) => {
                  if (!col.getIsVisible()) return acc
                  acc.push(
                    <TableCell key={col.id}>
                      <SkeletonCell
                        type={SKELETON_BY_COLUMN_ID[col.id] ?? "text"}
                      />
                    </TableCell>
                  )
                  return acc
                }, [])}
              </TableRow>
            ))
          ) : rows.length ? (
            rows.map((row) => (
              <TableRow className="animate-fade-in" key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={table.getVisibleLeafColumns().length}
                className="h-16 text-center text-muted-foreground"
              >
                {search ? (
                  <span>No items match “{search}”.</span>
                ) : (
                  "No items found for this dispatch."
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
