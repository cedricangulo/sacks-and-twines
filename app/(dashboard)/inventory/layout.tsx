import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { PageHeaderSetter } from "@/components/page-header-context"
import { Button } from "@/components/ui/button"

const AddInventoryDialog = dynamic(
  () => import("@/features/inventory/components/dialogs/add-inventory-dialog"),
  { loading: () => <Button>Add Inventory</Button> }
)

interface Props {
  children: React.ReactNode
}

export const metadata: Metadata = {
  title: "Inventory",
  description:
    "Track and manage inventory stock levels for sacks and twines products",
  openGraph: {
    title: "Inventory",
    description:
      "Track and manage inventory stock levels for sacks and twines products",
    url: "/inventory",
  },
  twitter: {
    title: "Inventory",
    description:
      "Track and manage inventory stock levels for sacks and twines products",
  },
  alternates: {
    canonical: "/inventory",
  },
}

export default function InventoryLayout({ children }: Props) {
  return (
    <>
      <PageHeaderSetter title="Inventory" actions={<AddInventoryDialog />} />
      <div className="px-6 space-y-6">{children}</div>
    </>
  )
}
