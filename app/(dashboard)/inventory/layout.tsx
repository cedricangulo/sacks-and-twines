import { PageHeaderSetter } from "@/components/page-header-context"
import AddInventoryDialog from "@/features/inventory/components/dialogs/add-inventory-dialog"

interface Props {
  children: React.ReactNode
}

export default function InventoryLayout({ children }: Props) {
  return (
    <>
      <PageHeaderSetter title="Inventory" actions={<AddInventoryDialog />} />
      <div className="p-6 space-y-6">{children}</div>
    </>
  )
}
