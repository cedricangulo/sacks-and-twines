"use client"

import { DotsThreeVerticalIcon, InfoIcon } from "@phosphor-icons/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { ReceivingBatch } from "../../validation"

interface ReceivingActionsMenuProps {
  batch: ReceivingBatch
  onViewDetails: (batch: ReceivingBatch) => void
}

/**
 * Per-row action menu. Mirrors `features/inventory/components/table/batch-actions-menu.tsx`
 * so every table's actions column looks and behaves the same.
 *
 * The dialog itself is lifted into the table container rather than mounted here
 * per row — at 30 rows per page that would be 30 dialog instances for one
 * visible dialog.
 */
export default function ReceivingActionsMenu({
  batch,
  onViewDetails,
}: ReceivingActionsMenuProps) {
  const [popoverOpen, setPopoverOpen] = useState(false)

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="p-0 size-8"
            aria-label={`View details for batch ${batch.batchCode}`}
          />
        }
      >
        <DotsThreeVerticalIcon weight="bold" size={14} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 p-1">
        <div className="flex flex-col gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="justify-start w-full gap-2"
            onClick={() => {
              setPopoverOpen(false)
              onViewDetails(batch)
            }}
          >
            <InfoIcon weight="fill" size={14} />
            View details
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
