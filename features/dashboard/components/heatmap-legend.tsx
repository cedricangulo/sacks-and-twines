import { cn } from "@/lib/utils"
import { HEATMAP_INTENSITY_CLASSES, INTENSITIES } from "../constants"

export default function HeatmapLegend() {
  return (
    <div className="flex items-center gap-1">
      <span className="text-caption text-muted-foreground">Low</span>
      {INTENSITIES.map((level) => (
        <div
          key={level}
          className={cn(
            "h-3 w-12 rounded-md",
            HEATMAP_INTENSITY_CLASSES[level]
          )}
        />
      ))}
      <span className="text-caption text-muted-foreground">High</span>
    </div>
  )
}
