import AddSupplierDialog from "@/features/suppliers/components/add-supplier-dialog"

interface Props {
  children: React.ReactNode
}

export default function SuppliersLayout({ children }: Props) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold type-lg">Suppliers</h2>
        <AddSupplierDialog />
      </div>
      {children}
    </div>
  )
}
