import AddStaffDialog from "@/features/users/components/add-staff-dialog"

interface Props {
  children: React.ReactNode
}

export default function UsersLayout({ children }: Props) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="type-lg font-semibold">Users</h2>
        <AddStaffDialog />
      </div>
      {children}
    </>
  )
}
