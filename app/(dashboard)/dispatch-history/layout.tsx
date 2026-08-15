import type { Metadata } from "next"
import { PageHeaderSetter } from "@/components/page-header-context"

interface Props {
  children: React.ReactNode
}

export const metadata: Metadata = {
  title: "Dispatch History",
  description:
    "View and search past dispatches and order history in the Sacks & Twines system",
  openGraph: {
    title: "Dispatch History",
    description:
      "View and search past dispatches and order history in the Sacks & Twines system",
    url: "/dispatch-history",
  },
  twitter: {
    title: "Dispatch History",
    description:
      "View and search past dispatches and order history in the Sacks & Twines system",
  },
  alternates: {
    canonical: "/dispatch-history",
  },
}

export default function DispatchHistoryLayout({ children }: Props) {
  return (
    <>
      <PageHeaderSetter title="Dispatch History" />
      <div className="px-6 pb-6 space-y-6">{children}</div>
    </>
  )
}
