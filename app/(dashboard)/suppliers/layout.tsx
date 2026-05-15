import AddSupplierDialog from "@/features/suppliers/components/add-supplier-dialog"

interface Props {
  children: React.ReactNode
}

export default function SuppliersLayout({ children }: Props) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="type-lg font-semibold">Suppliers</h2>
        <AddSupplierDialog />
      </div>
      {children}
    </>
  )
}
