import { History } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { PageHeaderSetter } from "@/components/page-header-context"
import { Button } from "@/components/ui/button"
import DispatchQueueSidebar from "@/features/dispatches/components/dispatch-queue-sidebar"
import MobileQueueSheet from "@/features/dispatches/components/mobile-queue-sheet"

interface Props {
  children: React.ReactNode
}

// TODO: Route is /products but this page manages dispatches, not product CRUD.
// Rename to /dispatch once group agrees on the URL.
export const metadata: Metadata = {
  title: "Dispatch",
  description:
    "Manage product dispatches and orders in the Sacks & Twines inventory system",
  openGraph: {
    title: "Dispatch",
    description:
      "Manage product dispatches and orders in the Sacks & Twines inventory system",
    url: "/products",
  },
  twitter: {
    title: "Dispatch",
    description:
      "Manage product dispatches and orders in the Sacks & Twines inventory system",
  },
  alternates: {
    canonical: "/products",
  },
}

export default function ProductsLayout({ children }: Props) {
  return (
    <>
      <PageHeaderSetter
        title="Dispatch"
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/dispatch-history">
                <History />
                History
              </Link>
            </Button>
            <MobileQueueSheet />
          </>
        }
      />
      <div className="flex h-[calc(100dvh-4rem)]">
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">{children}</div>
        <div className="hidden xl:flex">
          <DispatchQueueSidebar />
        </div>
      </div>
    </>
  )
}
