import { TooltipProvider } from "@/components/ui/tooltip"

interface Props {
  children: React.ReactNode
}

export default function Providers({ children }: Props) {
  return (
    <>
      <TooltipProvider>{children}</TooltipProvider>
    </>
  )
}
