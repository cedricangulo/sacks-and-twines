import type { Metadata } from "next"
import { PageHeaderSetter } from "@/components/page-header-context"
import InventoryActions from "./_client-actions"

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
      <PageHeaderSetter title="Inventory" actions={<InventoryActions />} />
      <div className="px-6 space-y-6">{children}</div>
    </>
  )
}
