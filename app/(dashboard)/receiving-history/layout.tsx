import type { Metadata } from "next"
import { PageHeaderSetter } from "@/components/page-header-context"

interface Props {
  children: React.ReactNode
}

const DESCRIPTION =
  "Browse and search past stock-in receipts, suppliers, quantities and procurement cost"

export const metadata: Metadata = {
  title: "Receiving History",
  description: DESCRIPTION,
  openGraph: {
    title: "Receiving History",
    description: DESCRIPTION,
    url: "/receiving-history",
  },
  twitter: {
    title: "Receiving History",
    description: DESCRIPTION,
  },
  alternates: {
    canonical: "/receiving-history",
  },
}

export default function ReceivingHistoryLayout({ children }: Props) {
  return (
    <>
      <PageHeaderSetter title="Receiving History" />
      <div className="min-w-0 px-6 pb-6 space-y-6">{children}</div>
    </>
  )
}
