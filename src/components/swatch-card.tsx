"use client"

import * as React from "react"
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

/**
 * Silhouettes for a dab of paint: closed smooth curves through radially
 * jittered points, each with one lobe pushed out and one edge bitten in — the
 * difference between paint squeezed from a tube and a pebble. A paint always
 * gets the same one, picked from its name, so Burnt Sienna looks like Burnt
 * Sienna wherever it turns up.
 */
const GLOBS = [
  "M21.75 9.60C21.50 12.10 18.33 19.53 16.37 21.33C14.41 23.13 12.11 21.25 9.99 20.39C7.88 19.53 4.32 18.08 3.68 16.18C3.04 14.28 5.29 11.20 6.14 8.98C6.98 6.77 6.79 3.35 8.74 2.91C10.70 2.47 15.71 5.22 17.88 6.33C20.05 7.45 22.01 7.10 21.75 9.60Z",
  "M22.11 10.05C21.77 12.01 19.18 15.19 17.18 16.97C15.18 18.76 12.01 20.71 10.13 20.77C8.25 20.84 6.68 18.82 5.90 17.34C5.11 15.87 5.52 13.61 5.41 11.92C5.30 10.22 4.10 8.62 5.24 7.19C6.39 5.76 9.95 3.68 12.29 3.34C14.62 3.01 17.63 4.08 19.26 5.20C20.90 6.32 22.46 8.09 22.11 10.05Z",
  "M21.82 10.00C21.97 11.83 17.62 15.52 15.77 17.41C13.91 19.30 12.30 21.78 10.71 21.33C9.12 20.88 7.43 17.26 6.24 14.73C5.06 12.20 2.83 8.28 3.59 6.12C4.34 3.96 8.88 1.72 10.75 1.78C12.63 1.83 12.98 5.06 14.82 6.43C16.66 7.80 21.66 8.17 21.82 10.00Z",
  "M20.13 13.10C20.07 14.72 18.13 15.30 16.82 16.49C15.52 17.69 14.02 19.92 12.33 20.27C10.63 20.61 7.78 19.34 6.65 18.58C5.53 17.81 6.03 17.44 5.59 15.66C5.16 13.88 3.58 9.40 4.06 7.90C4.54 6.41 6.93 7.71 8.49 6.70C10.05 5.68 11.97 1.79 13.42 1.80C14.87 1.81 16.07 4.89 17.19 6.78C18.30 8.66 20.19 11.48 20.13 13.10Z",
  "M19.62 12.00C19.76 14.85 19.48 19.08 17.54 20.66C15.59 22.24 9.87 22.43 7.96 21.48C6.06 20.53 6.63 17.33 6.12 14.96C5.62 12.58 3.94 8.82 4.93 7.23C5.93 5.63 10.13 6.02 12.10 5.41C14.07 4.80 15.50 2.45 16.76 3.55C18.01 4.64 19.49 9.15 19.62 12.00Z",
  "M20.45 13.27C20.94 15.53 20.34 18.96 18.76 19.77C17.18 20.58 13.19 18.56 10.96 18.12C8.73 17.69 6.44 18.40 5.36 17.17C4.29 15.94 4.13 12.45 4.50 10.77C4.87 9.09 6.55 8.21 7.58 7.11C8.60 6.01 9.28 4.30 10.66 4.15C12.03 4.00 14.19 4.70 15.83 6.22C17.46 7.74 19.96 11.01 20.45 13.27Z",
  "M22.27 12.73C22.22 14.72 18.28 18.07 16.67 19.12C15.07 20.18 14.19 19.46 12.64 19.06C11.10 18.66 9.03 17.84 7.40 16.72C5.78 15.61 2.97 14.48 2.89 12.37C2.81 10.27 5.41 5.81 6.92 4.09C8.43 2.36 10.26 1.49 11.95 2.01C13.63 2.52 15.30 5.39 17.02 7.18C18.74 8.97 22.33 10.74 22.27 12.73Z",
  "M19.35 12.61C19.72 14.26 19.76 16.05 18.87 17.64C17.98 19.22 15.75 22.00 14.01 22.10C12.26 22.21 9.89 19.69 8.39 18.28C6.89 16.87 5.63 15.31 5.03 13.65C4.43 11.98 4.09 9.57 4.78 8.31C5.47 7.04 7.67 6.94 9.16 6.05C10.65 5.16 12.50 2.69 13.74 2.97C14.99 3.26 15.70 6.16 16.63 7.76C17.56 9.37 18.97 10.97 19.35 12.61Z",
]

function hash(name: string): number {
  let h = 2166136261
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619)
  return h >>> 0
}

export function PaintGlob({
  hex,
  name,
  className,
}: {
  hex: string
  name: string
  className?: string
}) {
  const h = hash(name)
  const clip = `glob-${React.useId().replace(/:/g, "")}`
  const d = GLOBS[h % GLOBS.length]
  // Spun as well as swapped, so eight shapes go a good deal further.
  const spin = `rotate(${h % 360} 12 12)`

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn(
        // The outline has to show against both a near-black glob on a dark card
        // and a near-white one on a light card.
        "inline-block size-4 shrink-0 text-black/25 dark:text-white/35",
        className,
      )}
    >
      <clipPath id={clip}>
        <path d={d} transform={spin} />
      </clipPath>
      <path d={d} transform={spin} fill={hex} stroke="currentColor" strokeWidth="1" />
      {/* Wet paint catches the light in one place. The glob turns under it, so
          the highlight is clipped to whatever shape ended up underneath. */}
      <ellipse
        cx="9"
        cy="8.4"
        rx="3.4"
        ry="2.1"
        fill="#fff"
        opacity="0.2"
        transform="rotate(-28 9 8.4)"
        clipPath={`url(#${clip})`}
      />
    </svg>
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
              <PaintGlob hex={c.paint.hex} name={c.paint.name} />
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
