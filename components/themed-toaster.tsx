"use client"

import { useTheme } from "next-themes"
import { Toaster } from "sileo"

export function ThemedToaster() {
  const { resolvedTheme } = useTheme()

  return (
    <Toaster
      position="top-right"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
    />
  )
}
