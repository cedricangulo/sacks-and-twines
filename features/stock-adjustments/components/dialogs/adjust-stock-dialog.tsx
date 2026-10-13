"use client"

import { useQuery } from "convex-helpers/react/cache"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"
import { formatNumber } from "@/lib/formatters"
import { MAX_QUANTITY } from "@/lib/validation"
import { REASONS_BY_DIRECTION } from "../../constants"
import { useStockAdjustForm } from "../../hooks/use-stock-adjust-form"

// Dialog form for recording a stock adjustment (add/deduct) on a specific batch with reason and quantity.
export default function AdjustStockDialog({
  batchId,
  productId,
  batchCode,
  batchQuantity,
  open,
  onOpenChange,
}: {
  batchId: Id<"batches">
  productId: Id<"products">
  batchCode: string
  batchQuantity: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const { isAuthenticated } = useCurrentUser()
  const product = useQuery(
    api.products.queries.getById,
    isAuthenticated ? { productId } : "skip"
  )
  const allowDecimal = product?.baseUom === "meter"
  const unit = product?.baseUom ?? "pcs"

  const {
    open: dialogOpen,
    direction,
    quantity,
    reason,
    errors,
    isDirty,
    newQuantity,
    setDirection,
    setQuantity,
    setReason,
    setOpen,
    handleSubmit,
  } = useStockAdjustForm({
    batchId,
    productId,
    currentQuantity: product?.currentQuantity ?? 0,
    batchQuantity,
    unitLabel: unit,
    allowDecimal,
    open,
    onOpenChange,
  })

  const parsedQty = Number.parseFloat(quantity) || 0

  // The preview previously always subtracted, so picking "Add" showed the
  // batch quantity going down. This mirrors the direction.
  const newBatchQuantity =
    direction === "add"
      ? batchQuantity + parsedQty
      : Math.max(0, batchQuantity - parsedQty)

  const exceedsBatch =
    direction === "deduct" && parsedQty > batchQuantity && parsedQty > 0

  return (
    <Dialog open={dialogOpen} onOpenChange={setOpen}>
      {/* Header and footer are pinned; only the field body scrolls, so Confirm
          stays reachable without scrolling. `scrollable` is deliberately not
          used, because it would scroll the whole popup. */}
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 p-6 pb-4">
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {product ? (
              <>
                {product.name} · <span className="font-mono">{batchCode}</span>
              </>
            ) : (
              "Loading…"
            )}
          </DialogDescription>
        </DialogHeader>

        <div aria-hidden className="h-px shrink-0 bg-border" />

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <FieldGroup className="min-h-0 flex-1 gap-5 overflow-y-auto px-6 py-5 [scrollbar-width:thin]">
            {/* "Current stock" (product) and "Quantity remaining" (batch) used
                to sit in a four-row card with near-identical labels, so the
                number the adjustment actually applies to was ambiguous. The
                batch figure leads; the product total is context only. */}
            <BatchSummaryCard
              product={product}
              batchQuantity={batchQuantity}
              unit={unit}
            />

            <DirectionField
              direction={direction}
              setDirection={setDirection}
              error={errors.direction}
            />

            {/* Direction picks the reason list, so quantity and reason read as a
                pair downstream of it rather than three independent peers. */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <QuantityField
                quantity={quantity}
                setQuantity={setQuantity}
                direction={direction}
                batchQuantity={batchQuantity}
                unit={unit}
                allowDecimal={allowDecimal}
                exceedsBatch={exceedsBatch}
                error={errors.quantity}
              />

              <ReasonField
                reason={reason}
                setReason={setReason}
                direction={direction}
                error={errors.reason}
              />
            </div>

            <PreviewCard
              parsedQty={parsedQty}
              reason={reason}
              batchQuantity={batchQuantity}
              newBatchQuantity={newBatchQuantity}
              productTotal={product?.currentQuantity ?? 0}
              newQuantity={newQuantity}
              unit={unit}
            />
          </FieldGroup>

          <DialogFooter className="shrink-0 gap-2 border-t p-4 px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isDirty || exceedsBatch}>
              Adjust stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type ProductSummary =
  | {
      name: string
      currentQuantity: number
    }
  | null
  | undefined

// Batch-first summary: the batch figure leads, the product total is context.
// Skeleton while the product query is still loading.
function BatchSummaryCard({
  product,
  batchQuantity,
  unit,
}: {
  product: ProductSummary
  batchQuantity: number
  unit: string
}) {
  if (!product) return <Skeleton className="h-11 w-full" />
  return (
    <div className="rounded-2xl border bg-muted/30 px-4 py-3 type-body-small">
      <span className="text-muted-foreground">This batch: </span>
      <span className="font-medium tabular-nums">
        {formatNumber(batchQuantity)} {unit}
      </span>
      <span className="text-muted-foreground">{" · product total "}</span>
      <span className="tabular-nums">
        {formatNumber(product.currentQuantity)} {unit}
      </span>
    </div>
  )
}

// Add/Deduct direction radio pair with its validation error.
function DirectionField({
  direction,
  setDirection,
  error,
}: {
  direction: "add" | "deduct"
  setDirection: (direction: "add" | "deduct") => void
  error?: string
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel>Direction</FieldLabel>
      <FieldContent>
        <RadioGroup
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          value={direction}
          onValueChange={(v) => {
            if (v === "add" || v === "deduct") setDirection(v)
          }}
        >
          <FieldLabel htmlFor="adjust-direction-add">
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Add</FieldTitle>
              </FieldContent>
              <RadioGroupItem value="add" id="adjust-direction-add" />
            </Field>
          </FieldLabel>
          <FieldLabel htmlFor="adjust-direction-deduct">
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Deduct</FieldTitle>
              </FieldContent>
              <RadioGroupItem value="deduct" id="adjust-direction-deduct" />
            </Field>
          </FieldLabel>
        </RadioGroup>
      </FieldContent>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  )
}

// Quantity input capped at the batch remainder when deducting, with the
// "only N available" error taking precedence over the schema error.
function QuantityField({
  quantity,
  setQuantity,
  direction,
  batchQuantity,
  unit,
  allowDecimal,
  exceedsBatch,
  error,
}: {
  quantity: string
  setQuantity: (value: string) => void
  direction: "add" | "deduct"
  batchQuantity: number
  unit: string
  allowDecimal: boolean
  exceedsBatch: boolean
  error?: string
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="adjust-quantity">Quantity</FieldLabel>
      <FieldContent>
        <InputGroup>
          <InputGroupInput
            id="adjust-quantity"
            type="number"
            className="tabular-nums"
            step={allowDecimal ? "any" : "1"}
            min={allowDecimal ? "0.01" : "1"}
            max={
              direction === "deduct"
                ? Math.min(batchQuantity, MAX_QUANTITY)
                : MAX_QUANTITY
            }
            placeholder="0"
            value={quantity}
            aria-invalid={!!error || exceedsBatch}
            onInput={(e) => setQuantity(e.currentTarget.value)}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText>{unit}</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </FieldContent>
      {exceedsBatch && !error ? (
        <FieldError>
          Only {formatNumber(batchQuantity)} {unit} available in this batch
        </FieldError>
      ) : error ? (
        <FieldError>{error}</FieldError>
      ) : null}
    </Field>
  )
}

// Reason select whose options follow the picked direction.
function ReasonField({
  reason,
  setReason,
  direction,
  error,
}: {
  reason: string
  setReason: (value: string) => void
  direction: "add" | "deduct"
  error?: string
}) {
  return (
    <Field data-invalid={!!error}>
      <div className="flex items-center justify-between">
        <FieldLabel htmlFor="adjust-reason">Reason</FieldLabel>
        <span className="type-caption text-muted-foreground">Required</span>
      </div>
      <FieldContent>
        <Select value={reason} onValueChange={(v) => v != null && setReason(v)}>
          <SelectTrigger
            id="adjust-reason"
            className="w-full"
            aria-invalid={!!error}
          >
            <SelectValue placeholder="Select a reason…" />
          </SelectTrigger>
          <SelectContent className="w-auto max-w-(--available-width) min-w-(--anchor-width)">
            <SelectGroup>
              {REASONS_BY_DIRECTION[direction].map((r) => (
                <SelectItem
                  key={r.value}
                  value={r.value}
                  className="items-start"
                >
                  {/* Stacked, because SelectItem renders its text with
                      whitespace-nowrap inside an overflow-x-hidden
                      popup, so a single line gets clipped rather than
                      wrapped once the trigger is narrow. */}
                  <span className="flex flex-col gap-0.5">
                    <span>{r.label}</span>
                    <span className="font-normal text-muted-foreground type-body-small">
                      {r.description}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FieldContent>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  )
}

// Before → after preview for the batch and product totals. Hidden until a
// positive quantity and a reason are both picked.
function PreviewCard({
  parsedQty,
  reason,
  batchQuantity,
  newBatchQuantity,
  productTotal,
  newQuantity,
  unit,
}: {
  parsedQty: number
  reason: string
  batchQuantity: number
  newBatchQuantity: number
  productTotal: number
  newQuantity: number
  unit: string
}) {
  if (!(parsedQty > 0 && reason)) return null
  return (
    <div className="space-y-1 rounded-2xl border bg-muted/30 px-4 py-3 type-body-small">
      <p>
        <span className="text-muted-foreground">This batch: </span>
        <span className="tabular-nums">{formatNumber(batchQuantity)}</span>
        {" → "}
        <span className="font-medium tabular-nums">
          {formatNumber(newBatchQuantity)}
        </span>{" "}
        {unit}
      </p>
      <p>
        <span className="text-muted-foreground">Product total: </span>
        <span className="tabular-nums">{formatNumber(productTotal)}</span>
        {" → "}
        <span className="font-medium tabular-nums">
          {formatNumber(newQuantity)}
        </span>{" "}
        {unit}
      </p>
    </div>
  )
}
