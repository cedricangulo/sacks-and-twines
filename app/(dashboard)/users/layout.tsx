import AddStaffDialog from "@/features/users/components/add-staff-dialog"

interface Props {
  children: React.ReactNode
}

export default function UsersLayout({ children }: Props) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold type-lg">Users</h2>
        <AddStaffDialog />
      </div>
      {children}
    </div>
  )
}
