"use client"

import { ShoppingBagIcon } from "lucide-react"
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

export default function MobileQueueSheet() {
  const [open, setOpen] = useState(false)
  const { itemCount } = useDispatchQueueContext()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative md:hidden"
          aria-label={`Dispatch queue (${itemCount} items)`}
        >
          <ShoppingBagIcon />
          {itemCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 flex size-5 items-center justify-center p-0 text-[10px]"
            >
              {itemCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 p-0">
        <SheetTitle className="sr-only">Dispatch Queue</SheetTitle>
        <DispatchQueueSidebar onSuccess={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
