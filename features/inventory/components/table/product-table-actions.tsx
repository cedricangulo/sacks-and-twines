"use client"

import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  DotsThreeVerticalIcon,
  PencilIcon,
  WarningIcon,
} from "@phosphor-icons/react"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import EditProductDialog from "@/features/products/components/dialogs/edit-product-dialog"
import {
  useArchiveProduct,
  useUnarchiveProduct,
} from "@/features/products/hooks/use-archive-product"
import type { Product } from "../../validation"

// Popover menu with edit, archive, and unarchive actions for a product row.
export default function ProductTableActions({ product }: { product: Product }) {
  const archive = useArchiveProduct()
  const unarchive = useUnarchiveProduct()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [unarchiveAlertOpen, setUnarchiveAlertOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const isArchived = product.status === "archived"

  const handleArchive = async () => {
    setAlertOpen(false)
    await archive.submit(product._id, product.name)
  }

  const handleUnarchive = async () => {
    setUnarchiveAlertOpen(false)
    await unarchive.submit(product._id, product.name)
  }

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => e.stopPropagation()}
            />
          }
        >
          <DotsThreeVerticalIcon
            weight="bold"
            className="text-muted-foreground"
          />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-40 p-1">
          <div className="flex flex-col gap-0.5">
            <Button
              className="justify-start w-full gap-2"
              onClick={() => {
                setPopoverOpen(false)
                setEditOpen(true)
              }}
              variant="ghost"
            >
              <PencilIcon weight="fill" />
              Edit
            </Button>

            {isArchived ? (
              <Button
                className="justify-start w-full gap-2"
                onClick={() => {
                  setPopoverOpen(false)
                  setUnarchiveAlertOpen(true)
                }}
                variant="ghost"
              >
                <ArrowCounterClockwiseIcon weight="fill" />
                Unarchive
              </Button>
            ) : (
              <Button
                className="justify-start w-full gap-2 text-destructive hover:text-destructive"
                onClick={() => {
                  setPopoverOpen(false)
                  setAlertOpen(true)
                }}
                variant="ghost"
              >
                <ArchiveIcon weight="fill" />
                Archive
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <EditProductDialog
        productId={product._id}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <WarningIcon weight="fill" />
            </AlertDialogMedia>
            <AlertDialogTitle>Archive product</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive <strong>{product.name}</strong>. Archived
              products are hidden from dispatch and blocked from new stock-in
              while preserving transaction history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleArchive}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={unarchiveAlertOpen}
        onOpenChange={setUnarchiveAlertOpen}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-primary/10 text-primary">
              <ArrowCounterClockwiseIcon weight="fill" />
            </AlertDialogMedia>
            <AlertDialogTitle>Unarchive product</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore <strong>{product.name}</strong> to active use.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnarchive}>
              Unarchive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
