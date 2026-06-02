"use client"

import { TriangleAlertIcon } from "lucide-react"
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
import type { Id } from "@/convex/_generated/dataModel"
import { useDeactivateStaff } from "../hooks/use-deactivate-staff"

// Shape of a staff user row for the actions component.
type StaffUser = {
  _id: Id<"users">
  name?: string
  email: string
  status?: "active" | "deactivated"
}

// Deactivate button with confirmation dialog for a staff user row.
export default function StaffTableActions({ user }: { user: StaffUser }) {
  const deactivate = useDeactivateStaff()
  const [open, setOpen] = useState(false)

  if (user.status === "deactivated") {
    return null
  }

  const handleDeactivate = async () => {
    setOpen(false)
    await deactivate.submit(user._id, user.name ?? user.email)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          Deactivate
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TriangleAlertIcon className="text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Deactivate staff user</AlertDialogTitle>
          <AlertDialogDescription>
            This will deactivate <strong>{user.name ?? user.email}</strong>.
            They will no longer be able to access the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDeactivate}>
            Deactivate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
