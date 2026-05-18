"use client"

import { EllipsisVerticalIcon, PencilIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { Id } from "@/convex/_generated/dataModel"
import EditProductDialog from "@/features/products/components/dialogs/edit-product-dialog"

export default function ProductTableActions({
  productId,
}: {
  productId: Id<"products">
}) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => e.stopPropagation()}
          >
            <EllipsisVerticalIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-40 p-1">
          <div className="flex flex-col gap-0.5">
            <Button
              className="justify-start w-full gap-2"
              onClick={(e) => {
                e.stopPropagation()
                setPopoverOpen(false)
                setEditOpen(true)
              }}
              variant="ghost"
            >
              <PencilIcon />
              Edit
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <EditProductDialog
        productId={productId}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}
