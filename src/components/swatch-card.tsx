"use client"

import { motion } from "motion/react"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { describeParts, quality, type Recipe } from "@/lib/mix"
import { temperature, type Swatch } from "@/lib/extract"

const QUALITY_TONE: Record<string, string> = {
  "spot on": "text-emerald-600 dark:text-emerald-400",
  "very close": "text-emerald-600 dark:text-emerald-400",
  close: "text-amber-600 dark:text-amber-400",
  "in the neighbourhood": "text-muted-foreground",
}

export function PaintChip({ hex, className }: { hex: string; className?: string }) {
  return (
    <span
      className={cn(// The ring has to show against both a near-black chip on a dark card and a
      // near-white one on a light card.
      "inline-block size-3 shrink-0 rounded-[3px] ring-1 ring-black/20 ring-inset dark:ring-white/30", className)}
      style={{ background: hex }}
    />
  )
}

export function SwatchCard({
  swatch,
  recipe,
  index,
  active,
  onActivate,
}: {
  swatch: Swatch
  recipe: Recipe
  index: number
  active: boolean
  onActivate: (id: number | null) => void
}) {
  const q = quality(recipe.deltaE)
  // "White 1 + a touch + a touch" reads as equal parts when it is nothing of
  // the kind, so when only one component carries a number, call it the base.
  const lone = recipe.components.filter((c) => !c.touch).length === 1
  const single = recipe.components.length === 1

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3), ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => onActivate(swatch.id)}
      onMouseLeave={() => onActivate(null)}
      className={cn(
        "flex gap-4 rounded-xl border bg-card p-3 transition-colors",
        active ? "border-ring/60 bg-accent/40" : "hover:bg-accent/25",
      )}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <div
              className="relative size-16 shrink-0 overflow-hidden rounded-lg border shadow-xs"
              style={{ background: swatch.hex }}
            >
              <div
                className="absolute inset-0"
                style={{ background: recipe.hex, clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_top_right,transparent_calc(50%-0.5px),rgba(255,255,255,0.35)_50%,transparent_calc(50%+0.5px))]" />
            </div>
          }
        />
        <TooltipContent>
          Top left, the colour in the photo. Bottom right, what the mix gives you.
        </TooltipContent>
      </Tooltip>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-xs text-muted-foreground">{swatch.hex}</span>
          <Separatorish />
          <span className="text-xs text-muted-foreground">
            {(swatch.share * 100).toFixed(swatch.share < 0.01 ? 1 : 0)}% of the canvas
          </span>
          <Separatorish />
          <span className="text-xs text-muted-foreground capitalize">{temperature(swatch.lab)}</span>
          <Badge variant="outline" className={cn("ml-auto gap-1 text-[11px]", QUALITY_TONE[q])}>
            {q}
          </Badge>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          {recipe.components.map((c, i) => (
            <span key={c.paint.name} className="flex items-center gap-1.5 text-sm">
              {i > 0 && <span className="mr-1 text-muted-foreground/60">+</span>}
              <PaintChip hex={c.paint.hex} />
              <span className="font-medium">{c.paint.name}</span>
              {!single && (
                <span
                  className={cn(
                    "rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground",
                    c.touch && "italic",
                  )}
                >
                  {!c.touch && lone ? "base" : describeParts(c)}
                </span>
              )}
            </span>
          ))}
        </div>

        {recipe.components.length === 1 && (
          <p className="mt-1.5 text-xs text-muted-foreground">Straight from the tube.</p>
        )}
      </div>
    </motion.li>
  )
}

function Separatorish() {
  return <span aria-hidden className="text-muted-foreground/40">·</span>
}
