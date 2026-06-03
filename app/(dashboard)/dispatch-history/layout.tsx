import { PageHeaderSetter } from "@/components/page-header-context"

interface Props {
  children: React.ReactNode
}

export default function DispatchHistoryLayout({ children }: Props) {
  return (
    <>
      <PageHeaderSetter title="Dispatch History" />
      <div className="p-6 space-y-6">{children}</div>
    </>
  )
}
