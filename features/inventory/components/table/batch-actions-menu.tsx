"use client"

import { EllipsisVerticalIcon, PencilIcon, XCircleIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { Batch } from "../../validation"
import EditBatchDialog from "../dialogs/edit-batch-dialog"
import VoidBatchDialog from "../dialogs/void-batch-dialog"

export default function BatchActionsMenu({ batch }: { batch: Batch }) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)
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
    </>
  )
}
