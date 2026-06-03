import { PageHeaderSetter } from "@/components/page-header-context"

interface Props {
  children: React.ReactNode
}

export default function ReportsLayout({ children }: Props) {
  return (
    <>
      <PageHeaderSetter title="Reports" />
      <div className="p-6 space-y-6">{children}</div>
    </>
  )
}
