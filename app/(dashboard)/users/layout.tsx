import type { Metadata } from "next"
import { PageHeaderSetter } from "@/components/page-header-context"
import AddStaffDialog from "@/features/users/components/add-staff-dialog"

interface Props {
  children: React.ReactNode
}

export const metadata: Metadata = {
  title: "Users",
  description:
    "Manage staff accounts and user permissions in the Sacks & Twines system",
  openGraph: {
    title: "Users",
    description:
      "Manage staff accounts and user permissions in the Sacks & Twines system",
    url: "/users",
  },
  twitter: {
    title: "Users",
    description:
      "Manage staff accounts and user permissions in the Sacks & Twines system",
  },
  alternates: {
    canonical: "/users",
  },
}

export default function UsersLayout({ children }: Props) {
  return (
    <>
      <PageHeaderSetter title="Users" actions={<AddStaffDialog />} />
      <div className="p-6 space-y-6">{children}</div>
    </>
  )
}
