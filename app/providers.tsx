"use client"

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs"
import { ConvexReactClient } from "convex/react"
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache/provider"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemedToaster } from "@/components/themed-toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CurrentUserProvider } from "@/features/auth/components/current-user-provider"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
interface Props {
  children: React.ReactNode
}

export default function Providers({ children }: Props) {
  return (
    <NuqsAdapter>
      <ConvexAuthNextjsProvider client={convex}>
        <ConvexQueryCacheProvider>
          <ThemeProvider>
            <ThemedToaster />
            <TooltipProvider>
              <CurrentUserProvider>{children}</CurrentUserProvider>
            </TooltipProvider>
          </ThemeProvider>
        </ConvexQueryCacheProvider>
      </ConvexAuthNextjsProvider>
    </NuqsAdapter>
  )
}
