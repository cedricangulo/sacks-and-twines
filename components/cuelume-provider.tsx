"use client"

import { bind, setEnabled, setVolume } from "cuelume"
import { useEffect } from "react"
import { STORAGE_ENABLED, STORAGE_VOLUME } from "@/lib/cuelume"

export function CuelumeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    bind()

    try {
      const storedEnabled = localStorage.getItem(STORAGE_ENABLED)
      const storedVolume = localStorage.getItem(STORAGE_VOLUME)
      if (storedEnabled !== null) setEnabled(storedEnabled === "true")
      if (storedVolume !== null) {
        const v = Number.parseFloat(storedVolume)
        if (!Number.isNaN(v)) setVolume(v)
      }
    } catch {
      // storage blocked — silent no-op
    }
  }, [])

  return <>{children}</>
}
