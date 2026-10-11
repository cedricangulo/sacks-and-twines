import { cn } from "@/lib/utils"

/**
 * Live character counter for length-capped fields.
 *
 * Lives outside `components/ui/` on purpose: that directory is shadcn-managed
 * and excluded from Biome (see AGENTS.md), so anything added there is lost on
 * the next registry sync.
 *
 * Pairs with the `maxLength` attribute on the input — that attribute is what
 * actually prevents over-length input, and it is what assistive technology
 * announces. The counter is decorative, so it is hidden from screen readers;
 * an `aria-live` region here would narrate a new value on every keystroke.
 */
export function FieldCounter({
  className,
  value,
  max,
  ...props
}: React.ComponentProps<"span"> & { value: string; max: number }) {
  const length = value.length
  const remaining = max - length
  return (
    <span
      data-slot="field-counter"
      aria-hidden="true"
      className={cn(
        "type-caption tabular-nums text-muted-foreground",
        remaining <= 0 && "text-destructive",
        className
      )}
      {...props}
    >
      {length}/{max}
    </span>
  )
}
