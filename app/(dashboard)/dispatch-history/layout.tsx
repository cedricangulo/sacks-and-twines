import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Props {
  children: React.ReactNode
}

export default function DispatchHistoryLayout({ children }: Props) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-start gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/products">
            <ArrowLeft />
          </Link>
        </Button>
        <h2 className="font-semibold type-lg">Dispatch History</h2>
      </div>
      {children}
    </div>
  )
}
