import { ShieldX } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function ForbiddenPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-linear-to-br from-background via-background to-muted/40">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldX />
          </EmptyMedia>
          <EmptyTitle>Access Denied</EmptyTitle>
          <EmptyDescription>
            You don&apos;t have permission to access this page.
          </EmptyDescription>
        </EmptyHeader>
        <Button asChild>
          <Link href="/products">Go to Products</Link>
        </Button>
      </Empty>
    </div>
  )
}
