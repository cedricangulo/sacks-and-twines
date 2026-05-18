import AddInventoryDialog from "@/features/inventory/components/dialogs/add-inventory-dialog"

interface Props {
  children: React.ReactNode
}

export default function InventoryLayout({ children }: Props) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold type-lg">Inventory</h2>
        <AddInventoryDialog />
      </div>
      {children}
    </div>
  )
}
