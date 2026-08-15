"use client"

import { ClockCounterClockwiseIcon } from "@phosphor-icons/react"
import Link from "next/link"
import { PageHeaderSetter } from "@/components/page-header-context"
import { Button } from "@/components/ui/button"
import DispatchQueueSidebar from "@/features/dispatches/components/dispatch-queue-sidebar"
import MobileQueueSheet from "@/features/dispatches/components/mobile-queue-sheet"

interface Props {
  children: React.ReactNode
}

export default function ProductsClientLayout({ children }: Props) {
  return (
    <>
      <PageHeaderSetter
        title="Dispatch"
        actions={
          <>
            <Button
              variant="secondary"
              nativeButton={false}
              render={<Link href="/dispatch-history" />}
            >
              <ClockCounterClockwiseIcon weight="bold" />
              History
            </Button>
            <MobileQueueSheet />
          </>
        }
      />
      <div className="flex h-[calc(100dvh-5rem)]">
        <div className="flex-1 px-6 space-y-6 overflow-y-auto">{children}</div>
        <div className="hidden xl:flex pb-2 pr-2">
          <DispatchQueueSidebar />
        </div>
      </div>
    </>
  )
}
