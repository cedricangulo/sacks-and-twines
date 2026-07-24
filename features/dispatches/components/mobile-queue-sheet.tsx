"use client"

import { ShoppingBagIcon } from "@phosphor-icons/react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useDispatchQueueContext } from "../hooks/dispatch-queue-context"
import DispatchQueueSidebar from "./dispatch-queue-sidebar"

// Mobile slide-over sheet that wraps DispatchQueueSidebar, hidden on xl+ screens.
export default function MobileQueueSheet() {
  const [open, setOpen] = useState(false)
  const { itemCount } = useDispatchQueueContext()

  return (
    <Sheet open={open} onOpenChange={setOpen} modal={false}>
      <SheetTrigger asChild>
        <Button
          className="relative xl:hidden"
          aria-label={`Dispatch queue (${itemCount} items)`}
        >
          <ShoppingBagIcon weight="fill" />
          Queue
          {itemCount > 0 ? (
            <Badge
              variant="success"
              className="absolute -top-2 -right-2 flex size-5 items-center justify-center p-0 text-[10px]"
            >
              {itemCount}
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="p-2 bg-transparent border-transparent shadow-none w-80 rounded-2xl"
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">Dispatch Queue</SheetTitle>
        <DispatchQueueSidebar onSuccess={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
