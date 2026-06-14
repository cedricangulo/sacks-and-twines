"use client"

import { Progress as ProgressPrimitive } from "radix-ui"
import * as React from "react"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const isIndeterminate = value === undefined

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-indeterminate={isIndeterminate ? "" : undefined}
      className={cn(
        "relative flex h-3 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "size-full flex-1 bg-primary",
          isIndeterminate
            ? "w-1/3 animate-progress-indeterminate"
            : "transition-all"
        )}
        style={
          !isIndeterminate && value
            ? { transform: `translateX(-${100 - value}%)` }
            : undefined
        }
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
