"use client"

import { Loader2, XIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatNumber } from "@/lib/formatters"
import { getInitials } from "@/lib/utils"
import { useDispatchQueueContext } from "../hooks/dispatch-queue-context"
import { useDispatchSubmit } from "../hooks/use-dispatch-submit"

interface Props {
  onSuccess?: () => void
}

export default function DispatchQueueSidebar({ onSuccess }: Props) {
  const { items, itemCount, removeFromQueue } = useDispatchQueueContext()
  const {
    customerReference,
    setCustomerReference,
    isSubmitting,
    handleSubmit,
  } = useDispatchSubmit(onSuccess)

  return (
    <div className="flex flex-col w-full h-full border-l xl:w-80 bg-background">
      <div className="flex items-center justify-between p-4 pr-16 xl:pr-4">
        <h3 className="font-medium type-sm">Dispatch Queue</h3>
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
            {items.map((item) => (
              <li
                key={item.productId}
                className="flex items-center gap-2 pr-2 overflow-hidden border bg-card rounded-xl"
              >
                <Avatar className="border-r rounded-none size-15">
                  <AvatarImage src={item.imageUrl ?? ""} />
                  <AvatarFallback>{getInitials(item.name)}</AvatarFallback>
                </Avatar>

                <div className="flex flex-col flex-1 min-w-0">
                  <h4 className="truncate font-heading font-seminold type-base">
                    {item.name}
                  </h4>
                  <p className="font-mono type-base tabular-nums text-muted-foreground">
                    {formatNumber(item.quantity)} {item.dispatchUom}
                    {item.quantity !== 1 ? "s" : ""}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removeFromQueue(item.productId)}
                  aria-label={`Remove ${item.name} from dispatch queue`}
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2 p-4 border-t">
        <Label htmlFor="customerReference">Customer Reference</Label>
        <Input
          id="customerReference"
          placeholder="Name or plate number"
          value={customerReference}
          onChange={(e) => setCustomerReference(e.target.value)}
          disabled={isSubmitting}
        />
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={itemCount === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" />
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
