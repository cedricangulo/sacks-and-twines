import { PageHeaderSetter } from "@/components/page-header-context"
import AddSupplierDialog from "@/features/suppliers/components/add-supplier-dialog"

interface Props {
  children: React.ReactNode
}

export default function SuppliersLayout({ children }: Props) {
  return (
    <>
      <PageHeaderSetter title="Suppliers" actions={<AddSupplierDialog />} />
      <div className="p-6 space-y-6">{children}</div>
    </>
  )
}
