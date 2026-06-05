import type { Metadata } from "next"
import { PageHeaderSetter } from "@/components/page-header-context"
import AddSupplierDialog from "@/features/suppliers/components/add-supplier-dialog"

interface Props {
  children: React.ReactNode
}

export const metadata: Metadata = {
  title: "Suppliers",
  description:
    "Manage suppliers and vendor relationships for Sacks & Twines inventory",
  openGraph: {
    title: "Suppliers",
    description:
      "Manage suppliers and vendor relationships for Sacks & Twines inventory",
    url: "/suppliers",
  },
  twitter: {
    title: "Suppliers",
    description:
      "Manage suppliers and vendor relationships for Sacks & Twines inventory",
  },
  alternates: {
    canonical: "/suppliers",
  },
}

export default function SuppliersLayout({ children }: Props) {
  return (
    <>
      <PageHeaderSetter title="Suppliers" actions={<AddSupplierDialog />} />
      <div className="p-6 space-y-6">{children}</div>
    </>
  )
}
