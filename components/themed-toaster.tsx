"use client"

import { useTheme } from "next-themes"
import { Toaster } from "sileo"

export function ThemedToaster() {
  const { resolvedTheme } = useTheme()

  return (
    <Toaster
      position="top-center"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      options={{
        fill:
          resolvedTheme === "dark"
            ? "oklch(0.214 0.009 43.1)"
            : "oklch(0.96 0.002 17.2)",
        roundness: 16,
        styles: {
          title: "text-foreground! font-medium!",
          description: "text-muted-foreground!",
          badge: "ring-1 ring-border!",
          button:
            "bg-primary! text-primary-foreground! rounded-md! text-sm! font-medium!",
        },
      }}
    />
  )
}
