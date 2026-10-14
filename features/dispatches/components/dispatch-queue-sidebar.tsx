"use client"

import { XIcon } from "@phosphor-icons/react"
import Image from "next/image"
import { FieldCounter } from "@/components/field-counter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { Field, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { useCurrentUser } from "@/features/auth/components/current-user-provider"
import { formatNumber } from "@/lib/formatters"
import { getInitials } from "@/lib/utils"
import { useDispatchQueueContext } from "../hooks/dispatch-queue-context"
import { useDispatchSubmit } from "../hooks/use-dispatch-submit"
import type { DispatchSubmitFieldErrors } from "../validation"
import { CUSTOMER_REFERENCE_MAX } from "../validation"

interface Props {
  onSuccess?: () => void
}

// First submit error for the queue row at `index`, if any. Error keys are
// full paths (`items.0.quantity`), so the row looks up its own fields.
function queueRowError(
  errors: DispatchSubmitFieldErrors,
  index: number
): string | undefined {
  const prefix = `items.${index}.`
  for (const key of Object.keys(errors)) {
    if (key.startsWith(prefix)) return errors[key]
  }
  return undefined
}

// Desktop sidebar showing selected dispatch items, customer reference input, and a submit button.
export default function DispatchQueueSidebar({ onSuccess }: Props) {
  const { items, itemCount, removeFromQueue } = useDispatchQueueContext()
  const { user } = useCurrentUser()
  const {
    customerReference,
    setCustomerReference,
    dispatchDate,
    setDispatchDate,
    dispatchTime,
    setDispatchTime,
    isSubmitting,
    errors,
    handleSubmit,
  } = useDispatchSubmit(onSuccess)

  return (
    <div className="flex flex-col w-full h-full border shadow-sm rounded-2xl xl:w-80 bg-card">
      <div className="flex items-center justify-between p-4 pr-16 xl:pr-4">
        <h3 className="font-medium type-body-small">Dispatch Queue</h3>
        <Badge variant="success">
          {itemCount} {itemCount === 1 ? "item" : "items"} selected
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto">
        {itemCount === 0 ? (
          <p className="my-6 text-center text-muted-foreground">
            No items selected
          </p>
        ) : (
          <ul className="p-4 space-y-2">
            {items.map((item, index) => (
              <li
                key={item.productId}
                className="flex items-center gap-2 pr-2 overflow-hidden border bg-card rounded-2xl"
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    className="object-cover size-15"
                    width={60}
                    height={60}
                  />
                ) : (
                  <div
                    aria-hidden
                    className="flex items-center justify-center text-muted-foreground size-15 bg-muted type-body-small font-medium"
                  >
                    {getInitials(item.name)}
                  </div>
                )}

                <div className="flex flex-col flex-1 min-w-0 py-2">
                  <h4
                    className="font-semibold line-clamp-1 type-body-default"
                    title={item.name}
                  >
                    {item.name}
                  </h4>
                  <p className="font-mono type-body-default tabular-nums text-muted-foreground">
                    {formatNumber(item.quantity)} {item.dispatchUom}
                    {item.quantity !== 1 ? "s" : ""}
                  </p>
                  {queueRowError(errors, index) ? (
                    <p className="type-body-small text-destructive">
                      {queueRowError(errors, index)}
                    </p>
                  ) : null}
                </div>

                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removeFromQueue(item.productId)}
                  aria-label={`Remove ${item.name} from dispatch queue`}
                >
                  <XIcon weight="bold" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2 p-4 border-t">
        <Field data-invalid={!!errors.customerReference}>
          <div className="flex items-center justify-between">
            <Label htmlFor="customerReference">Customer Reference</Label>
            <FieldCounter
              value={customerReference}
              max={CUSTOMER_REFERENCE_MAX}
            />
          </div>
          <Input
            id="customerReference"
            maxLength={CUSTOMER_REFERENCE_MAX}
            placeholder="Name or plate number"
            value={customerReference}
            onChange={(e) => setCustomerReference(e.target.value)}
            disabled={isSubmitting}
            aria-invalid={!!errors.customerReference}
          />
          <FieldError>{errors.customerReference}</FieldError>
        </Field>
        {user?.role === "owner" ? (
          <DateTimePicker
            idPrefix="dispatch"
            label="Dispatch Date"
            value={{ date: dispatchDate, time: dispatchTime }}
            onChange={({ date, time }) => {
              setDispatchDate(date)
              setDispatchTime(time)
            }}
            error={errors.createdAt}
            disabled={isSubmitting}
          />
        ) : (
          // Staff dispatches always stamp now (server rejects overrides), so
          // the picker is owner-only instead of a control that never works.
          <p className="type-body-small text-muted-foreground">
            Recorded as of now. Only owners can backdate a dispatch.
          </p>
        )}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={itemCount === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Spinner />
              Dispatching&hellip;
            </>
          ) : (
            "Dispatch"
          )}
        </Button>
      </div>
    </div>
  )
}
