"use client"

import { ArchiveIcon, PencilIcon, TriangleAlertIcon } from "lucide-react"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useArchiveSupplier } from "../hooks/use-archive-supplier"
import { type Supplier } from "../validation"
import EditSupplierDialog from "./edit-supplier-dialog"

export default function SupplierTableActions({
  supplier,
}: {
  supplier: Supplier
}) {
  const archive = useArchiveSupplier()
  const [open, setOpen] = useState(false)

  const isArchived = supplier.archivedAt !== undefined

  const handleArchive = async () => {
    setOpen(false)
    await archive.submit(supplier._id, supplier.companyName)
  }

  return (
    <div className="flex items-center gap-2">
      <EditSupplierDialog supplier={supplier}>
        <Button variant="outline" size="sm">
          <PencilIcon size={14} />
        </Button>
      </EditSupplierDialog>

      {!isArchived ? (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <ArchiveIcon size={14} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogMedia>
                <TriangleAlertIcon className="text-destructive" />
              </AlertDialogMedia>
              <AlertDialogTitle>Archive supplier</AlertDialogTitle>
              <AlertDialogDescription>
                This will archive <strong>{supplier.companyName}</strong>.
                Archived suppliers are hidden from active use.
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
      ) : null}
    </div>
  )
}
