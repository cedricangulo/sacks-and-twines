"use client"

import { PowerIcon, WarningIcon } from "@phosphor-icons/react"
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
import { useActivateStaff } from "../hooks/use-activate-staff"
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
  const activate = useActivateStaff()
  const [open, setOpen] = useState(false)

  if (user.status === "deactivated") {
    const handleActivate = async () => {
      setOpen(false)
      await activate.submit(user._id, user.name ?? user.email)
    }

    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
          Activate
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <PowerIcon
                weight="bold"
                className="text-green-600 dark:text-green-400"
              />
            </AlertDialogMedia>
            <AlertDialogTitle>Activate staff user</AlertDialogTitle>
            <AlertDialogDescription>
              This will activate <strong>{user.name ?? user.email}</strong>.
              They will regain access to the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivate}>
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  const handleDeactivate = async () => {
    setOpen(false)
    await deactivate.submit(user._id, user.name ?? user.email)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        Deactivate
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <WarningIcon weight="fill" className="text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Deactivate staff user</AlertDialogTitle>
          <AlertDialogDescription>
            This will deactivate <strong>{user.name ?? user.email}</strong>.
            They will no longer be able to access the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel autoFocus>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDeactivate}>
            Deactivate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
