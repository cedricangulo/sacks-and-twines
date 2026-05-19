import { History } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import DispatchQueueSidebar from "@/features/dispatches/components/dispatch-queue-sidebar"
import MobileQueueSheet from "@/features/dispatches/components/mobile-queue-sheet"
import { DispatchQueueProvider } from "@/features/dispatches/hooks/dispatch-queue-context"

interface Props {
  children: React.ReactNode
}

export default function ProductsLayout({ children }: Props) {
  return (
    <DispatchQueueProvider>
      <div className="flex h-[calc(100dvh-4rem)]">
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold type-lg">Dispatch</h2>
              <p className="text-sm text-muted-foreground">
                Select products to dispatch
              </p>
            </div>
            <div className="flex items-center gap-2">
              <MobileQueueSheet />
              <Button variant="outline" asChild>
                <Link href="/dispatch-history">
                  <History />
                  History
                </Link>
              </Button>
            </div>
          </div>
          {children}
        </div>
        <div className="hidden md:flex">
          <DispatchQueueSidebar />
        </div>
      </div>
    </DispatchQueueProvider>
  )
}
