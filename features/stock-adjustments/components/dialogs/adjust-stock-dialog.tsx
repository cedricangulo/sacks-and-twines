"use client"

import { useConvexAuth } from "convex/react"
import { useQuery } from "convex-helpers/react/cache"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useStockAdjustForm } from "../../hooks/use-stock-adjust-form"

const REASONS_BY_DIRECTION: Record<
  "add" | "deduct",
  { value: string; label: string; description: string }[]
> = {
  add: [
    {
      value: "recount",
      label: "Recount",
      description: "Inventory recount correction",
    },
    {
      value: "system_reversal",
      label: "System Reversal",
      description: "Reversal of system error",
    },
  ],
  deduct: [
    {
      value: "damaged",
      label: "Damaged",
      description: "Products damaged in storage",
    },
    { value: "lost", label: "Lost", description: "Products lost or missing" },
    {
      value: "recount",
      label: "Recount",
      description: "Inventory recount correction",
    },
    {
      value: "system_reversal",
      label: "System Reversal",
      description: "Reversal of system error",
    },
  ],
}

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
  const { isAuthenticated } = useConvexAuth()
  const product = useQuery(
    api.products.queries.getById,
    isAuthenticated ? { productId } : "skip"
  )

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
    open,
    onOpenChange,
  })

  const parsedQty = Number.parseFloat(quantity) || 0

  return (
    <Dialog open={dialogOpen} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            Record a stock adjustment for this batch.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border bg-muted/30 p-4 text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">Batch:</span>{" "}
            <span className="font-mono">{batchCode}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Product:</span>{" "}
            {product?.name ?? "Loading..."}
          </p>
          <p>
            <span className="text-muted-foreground">Current stock:</span>{" "}
            <span className="font-medium">
              {(product?.currentQuantity ?? 0).toLocaleString()}{" "}
              {product?.baseUom ?? "pcs"}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Quantity Remaining:</span>{" "}
            <span className="font-medium">
              {batchQuantity.toLocaleString()} {product?.baseUom ?? "pcs"}
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <>
            <Field data-invalid={!!errors.direction}>
              <FieldLabel>Direction</FieldLabel>
              <FieldContent>
                <RadioGroup
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
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
                      <RadioGroupItem
                        value="deduct"
                        id="adjust-direction-deduct"
                      />
                    </Field>
                  </FieldLabel>
                </RadioGroup>
              </FieldContent>
              {errors.direction ? (
                <FieldError>{errors.direction}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={!!errors.quantity}>
              <FieldLabel htmlFor="adjust-quantity">Quantity</FieldLabel>
              <FieldContent>
                <Input
                  id="adjust-quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0"
                  value={quantity}
                  aria-invalid={!!errors.quantity}
                  onInput={(e) => setQuantity(e.currentTarget.value)}
                />
              </FieldContent>
              {errors.quantity ? (
                <FieldError>{errors.quantity}</FieldError>
              ) : null}
            </Field>
          </>

          <Field data-invalid={!!errors.reason}>
            <FieldLabel htmlFor="adjust-reason">Reason</FieldLabel>
            <FieldContent>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger
                  id="adjust-reason"
                  className="w-full"
                  aria-invalid={!!errors.reason}
                >
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {REASONS_BY_DIRECTION[direction].map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        <span>{r.label}</span>
                        {" - "}
                        <span className="text-muted-foreground type-sm font-normal">
                          {r.description}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FieldContent>
            {errors.reason ? <FieldError>{errors.reason}</FieldError> : null}
          </Field>

          {parsedQty > 0 && reason ? (
            <div>
              <p className="text-sm text-muted-foreground">
                New stock after adjustment:{" "}
                <span className="font-medium">
                  {newQuantity.toLocaleString()} {product?.baseUom ?? "pcs"}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Adjusted quantity:{" "}
                <span className="font-medium">
                  {batchQuantity - parsedQty <= 0
                    ? 0
                    : batchQuantity - parsedQty}{" "}
                  {product?.baseUom ?? "pcs"}
                </span>
              </p>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isDirty}>
              Confirm
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
