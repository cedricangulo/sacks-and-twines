"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-linear-to-br from-background via-background to-muted/40">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <X />
          </EmptyMedia>
          <EmptyTitle>Page Not Found</EmptyTitle>
          <EmptyDescription>
            The page you are looking for does not exist.
          </EmptyDescription>
        </EmptyHeader>
        <Button onClick={() => window.history.back()}>Go Back</Button>
      </Empty>
    </div>
  )
}
