import { History } from "lucide-react"
import Link from "next/link"
import { PageHeaderSetter } from "@/components/page-header-context"
import { Button } from "@/components/ui/button"
import DispatchQueueSidebar from "@/features/dispatches/components/dispatch-queue-sidebar"
import MobileQueueSheet from "@/features/dispatches/components/mobile-queue-sheet"

interface Props {
  children: React.ReactNode
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
