import { Toaster } from "sileo"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"

interface Props {
  children: React.ReactNode
}

export default function Providers({ children }: Props) {
  return (
    <>
      <ThemeProvider>
        <Toaster position="top-center" />
        <TooltipProvider>{children}</TooltipProvider>
      </ThemeProvider>
    </>
  )
}
