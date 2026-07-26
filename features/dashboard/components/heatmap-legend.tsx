import { cn } from "@/lib/utils"

const INTENSITIES = [1, 2, 3, 4, 5] as const

export default function HeatmapLegend() {
  return (
    <div className="flex items-center gap-1">
      <span className="text-caption text-muted-foreground">Low</span>
      {INTENSITIES.map((level) => (
        <div
          key={level}
          className={cn(
            "size-2 rounded-full",
            level === 1 && "bg-amber-100 dark:bg-amber-950/60",
            level === 2 && "bg-amber-200 dark:bg-amber-900/60",
            level === 3 && "bg-amber-300 dark:bg-amber-800/60",
            level === 4 && "bg-amber-400 dark:bg-amber-700/60",
            level === 5 && "bg-amber-500 dark:bg-amber-600/60"
          )}
        />
      ))}
      <span className="text-caption text-muted-foreground">High</span>
    </div>
  )
}
