import AddInventoryDialog from "@/features/inventory/components/dialogs/add-inventory-dialog"

interface Props {
  children: React.ReactNode
}

export default function InventoryLayout({ children }: Props) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="type-lg font-semibold">Inventory</h2>
        <AddInventoryDialog />
      </div>
      {children}
    </>
  )
}
