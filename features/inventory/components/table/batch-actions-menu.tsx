"use client"

import { EllipsisVerticalIcon, PencilIcon, XCircleIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import AdjustStockDialog from "@/features/stock-adjustments/components/dialogs/adjust-stock-dialog"
import type { Batch } from "../../validation"
import EditBatchDialog from "../dialogs/edit-batch-dialog"
import VoidBatchDialog from "../dialogs/void-batch-dialog"

// Popover menu with edit, adjust, and void actions for a batch row.
export default function BatchActionsMenu({ batch }: { batch: Batch }) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const isActive = batch.status === "active"

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="p-0 size-8"
            disabled={!isActive}
          >
            <EllipsisVerticalIcon size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-40 p-1">
          <div className="flex flex-col gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="justify-start w-full gap-2"
              onClick={() => {
                setPopoverOpen(false)
                setEditOpen(true)
              }}
            >
              <PencilIcon size={14} />
              Edit
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="justify-start w-full gap-2"
              onClick={() => {
                setPopoverOpen(false)
                setAdjustOpen(true)
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Adjust
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="justify-start w-full gap-2 text-destructive hover:text-destructive"
              onClick={() => {
                setPopoverOpen(false)
                setVoidOpen(true)
              }}
            >
              <XCircleIcon size={14} />
              Void
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <EditBatchDialog
        batchId={batch._id}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <VoidBatchDialog
        batchId={batch._id}
        open={voidOpen}
        onOpenChange={setVoidOpen}
      />

      <AdjustStockDialog
        batchId={batch._id}
        batchQuantity={batch.quantityRemaining}
        productId={batch.productId}
        batchCode={batch.batchCode}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
      />
    </>
  )
}
