"use client"

import { ClockCounterClockwiseIcon } from "@phosphor-icons/react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const AddInventoryDialog = dynamic(
  () => import("@/features/inventory/components/dialogs/add-inventory-dialog"),
  { loading: () => <Button>Add Inventory</Button> }
)

// Page header actions for the inventory page. Lives in a client component
// because the icon library and `Link` are client-side imports — the layout
// itself stays a server component.
export default function InventoryActions() {
  return (
    <>
      <Button
        variant="secondary"
        nativeButton={false}
        render={<Link href="/receiving-history" />}
      >
        <ClockCounterClockwiseIcon weight="bold" />
        History
      </Button>
      <AddInventoryDialog />
    </>
  )
}
