import { PageHeaderSetter } from "@/components/page-header-context"
import AddStaffDialog from "@/features/users/components/add-staff-dialog"

interface Props {
  children: React.ReactNode
}

export default function UsersLayout({ children }: Props) {
  return (
    <>
      <PageHeaderSetter title="Users" actions={<AddStaffDialog />} />
      <div className="p-6 space-y-6">{children}</div>
    </>
  )
}
