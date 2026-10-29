"use client"

import * as React from "react"
import { motion } from "motion/react"
import { Copy, ImageUp, Images, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { TooltipProvider } from "@/components/ui/tooltip"
import { PaintGlob, SwatchCard } from "@/components/swatch-card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { SAMPLES, type Sample } from "@/lib/samples"
import {
  TEMPERATURES,
  VALUE_BANDS,
  extractSwatches,
  temperature,
  valueBand,
  type Swatch,
} from "@/lib/extract"
import { choosePalette, describeParts, solve, type Recipe } from "@/lib/mix"
import { FAMILY_ORDER, type Paint } from "@/lib/paints"
import { PALETTE_BY_ID, PALETTE_OPTIONS, paintsOf, type PaletteId } from "@/lib/palettes"

type Grouping = "value" | "temperature"
type Loaded = { id: number; src: string; width: number; height: number; label: string }

const SAMPLE_WIDTH = 280
const NO_SWATCHES: Swatch[] = []

/** Identifies a loaded photo without comparing megabytes of data URL. */
let nextImageId = 0

export function PaintersPalette() {
  const [image, setImage] = React.useState<Loaded | null>(null)
  const [count, setCount] = React.useState(7)
  const [maxPaints, setMaxPaints] = React.useState(3)
  const [paletteId, setPaletteId] = React.useState<PaletteId>("auto")
  const [grouping, setGrouping] = React.useState<Grouping>("value")
  const [allowWhite, setAllowWhite] = React.useState(true)
  const [allowBlack, setAllowBlack] = React.useState(false)
  const [analysis, setAnalysis] = React.useState<{ key: string; swatches: Swatch[] } | null>(null)
  const [active, setActive] = React.useState<number | null>(null)
  const [picking, setPicking] = React.useState(false)
  const fileInput = React.useRef<HTMLInputElement>(null)

  const load = React.useCallback((src: string, label: string) => {
    const img = new Image()
    img.onload = () =>
      setImage({
        id: ++nextImageId,
        src,
        width: img.naturalWidth,
        height: img.naturalHeight,
        label,
      })
    img.onerror = () => toast.error("That file would not open as an image.")
    img.src = src
  }, [])

  const takeFile = React.useCallback(
    (file: File | null | undefined) => {
      if (!file) return
      if (!file.type.startsWith("image/")) {
        toast.error("Pick an image file — JPEG, PNG, WebP or HEIC.")
        return
      }
      const reader = new FileReader()
      reader.onload = () => load(String(reader.result), file.name)
      reader.readAsDataURL(file)
    },
    [load],
  )

  const takeSample = React.useCallback(
    (choice: Sample) => {
      setPicking(false)
      load(choice.src, choice.label)
    },
    [load],
  )

  React.useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"))
      if (file) takeFile(file)
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [takeFile])

  // What the current photo and group count would produce, so the swatches on
  // screen are always the ones that belong to them — never a stale pass.
  const key = image ? `${image.id}:${count}` : null
  const swatches = key && analysis?.key === key ? analysis.swatches : NO_SWATCHES
  const reading = key !== null && analysis?.key !== key

  // Read the photo down to a thumbnail before clustering: a 280px sample holds
  // every colour mass that matters and keeps the whole pass under a frame or two.
  React.useEffect(() => {
    if (!image || !key) return
    const img = new Image()
    let cancelled = false
    img.onload = () => {
      if (cancelled) return
      const scale = Math.min(1, SAMPLE_WIDTH / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.max(1, Math.round(img.naturalWidth * scale))
      const h = Math.max(1, Math.round(img.naturalHeight * scale))
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!
      ctx.drawImage(img, 0, 0, w, h)
      const { data } = ctx.getImageData(0, 0, w, h)
      setAnalysis({ key, swatches: extractSwatches(data, w, h, count) })
    }
    img.src = image.src
    return () => {
      cancelled = true
    }
  }, [image, count, key])

  const preset = PALETTE_BY_ID.get(paletteId)!
  // A named palette fixes its own tubes. "Full" fixes none and matches each
  // colour on its own. Everything else is worked out from the photo: the tubes
  // that each buy the largest drop in error across the whole picture.
  const palette = React.useMemo(() => {
    if (paletteId === "full") return undefined
    const fixed = paintsOf(paletteId)
    if (fixed) return fixed
    if (!swatches.length) return undefined
    return choosePalette(
      swatches.map((s) => s.lab),
      swatches.map((s) => s.share),
      { size: 8, allowWhite, allowBlack },
    )
  }, [paletteId, swatches, allowWhite, allowBlack])

  const recipes = React.useMemo(() => {
    const map = new Map<number, Recipe>()
    for (const s of swatches) {
      map.set(s.id, solve(s.lab, { maxPaints, allowWhite, allowBlack, palette }))
    }
    return map
  }, [swatches, maxPaints, allowWhite, allowBlack, palette])

  const tubes = React.useMemo(() => {
    const used = new Map<string, { paint: Paint; weight: number }>()
    for (const s of swatches) {
      const recipe = recipes.get(s.id)
      if (!recipe) continue
      for (const c of recipe.components) {
        const hit = used.get(c.paint.name)
        if (hit) hit.weight += c.volume * s.share
        else used.set(c.paint.name, { paint: c.paint, weight: c.volume * s.share })
      }
    }
    // A tube you squeezed out and did not reach for is still on the palette, so
    // a fixed set lists all of them — the empty bar is the useful part.
    const list = palette
      ? palette.map((paint) => ({ paint, weight: used.get(paint.name)?.weight ?? 0 }))
      : Array.from(used.values())
    return list.sort(
      (a, b) =>
        FAMILY_ORDER.indexOf(a.paint.family) - FAMILY_ORDER.indexOf(b.paint.family) ||
        b.weight - a.weight,
    )
  }, [swatches, recipes, palette])

  const unusedCount = tubes.filter((t) => t.weight === 0).length

  const groups = React.useMemo(() => {
    const defs =
      grouping === "value"
        ? VALUE_BANDS.map((b) => ({ ...b, test: (s: Swatch) => valueBand(s.lab) === b.key }))
        : TEMPERATURES.map((t) => ({ ...t, test: (s: Swatch) => temperature(s.lab) === t.key }))
    return defs
      .map((def) => ({ ...def, items: swatches.filter(def.test) }))
      .filter((g) => g.items.length > 0)
  }, [swatches, grouping])

  const copyPalette = () => {
    const lines: string[] = [
      `PAINTER'S PALETTE — ${image?.label ?? "photo"}`,
      `${tubes.length} tube${tubes.length === 1 ? "" : "s"}, ${swatches.length} colour groups`,
      "",
      "ON THE PALETTE",
      ...tubes.map((t) => `  ${t.paint.name} (${t.paint.pigment})`),
      "",
    ]
    for (const group of groups) {
      lines.push(group.label.toUpperCase())
      for (const s of group.items) {
        const r = recipes.get(s.id)
        if (!r) continue
        const mix = r.components
          .map((c) => (c.touch ? `a touch of ${c.paint.name}` : `${c.paint.name} ${describeParts(c)}`))
          .join(" + ")
        lines.push(`  ${s.hex}  ${(s.share * 100).toFixed(0)}%  ${mix}`)
      }
      lines.push("")
    }
    navigator.clipboard
      .writeText(lines.join("\n").trimEnd() + "\n")
      .then(() => toast.success("Palette and mixes copied"))
      .catch(() => toast.error("The clipboard refused that one."))
  }

  return (
    <TooltipProvider>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => takeFile(e.target.files?.[0])}
      />

      <SamplePicker open={picking} onOpenChange={setPicking} onChoose={takeSample} />

      {!image ? (
        <Dropzone
          onPick={() => fileInput.current?.click()}
          onDrop={takeFile}
          onBrowseSamples={() => setPicking(true)}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* The reference stays in view while the recipes are read beside it, so
              the whole left column sticks and scrolls within itself. */}
          <div className="space-y-6 lg:sticky lg:top-18 lg:col-span-5 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pb-2">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="truncate">{image.label}</CardTitle>
                <CardDescription>
                  {image.width} × {image.height}. Each dot sits where that colour is most typical.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.src} alt={image.label} className="block w-full" />
                  {swatches.map((s) => (
                    <motion.span
                      key={s.id}
                      aria-hidden
                      animate={{ scale: active === s.id ? 1.6 : 1 }}
                      transition={{ type: "spring", stiffness: 420, damping: 26 }}
                      onMouseEnter={() => setActive(s.id)}
                      onMouseLeave={() => setActive(null)}
                      className={cn(
                        "absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white/80 shadow-sm",
                        active === s.id && "z-10 ring-white",
                      )}
                      style={{
                        background: s.hex,
                        left: `${s.spot.x * 100}%`,
                        top: `${s.spot.y * 100}%`,
                      }}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                    <ImageUp /> Another photo
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPicking(true)}>
                    <Images /> Sample photos
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setImage(null)}>
                    <RotateCcw /> Start over
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Controls
              found={swatches.length}
              count={count}
              setCount={setCount}
              fixedPalette={preset.paints !== undefined}
              paletteName={preset.name}
              maxPaints={maxPaints}
              setMaxPaints={setMaxPaints}
              grouping={grouping}
              setGrouping={setGrouping}
              allowWhite={allowWhite}
              setAllowWhite={setAllowWhite}
              allowBlack={allowBlack}
              setAllowBlack={setAllowBlack}
            />
          </div>

          <div className="space-y-6 lg:col-span-7">
            <Card>
              <CardHeader className="gap-2.5">
                {/* Seven segments do not fit a phone, so the control scrolls
                    sideways rather than wrapping and breaking its joined edges. */}
                <div className="-mx-0.5 overflow-x-auto px-0.5 py-0.5">
                  <ToggleGroup
                    variant="outline"
                    spacing={0}
                    aria-label="Palette"
                    className="w-max min-w-full"
                    value={[paletteId]}
                    onValueChange={(v) => v[0] && setPaletteId(v[0] as PaletteId)}
                  >
                    {PALETTE_OPTIONS.map((option) => (
                      <ToggleGroupItem
                        key={option.id}
                        value={option.id}
                        className="grow whitespace-nowrap"
                      >
                        {option.short}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
                <CardDescription>{preset.note}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-x-4 gap-y-5">
                {tubes.map((t) => (
                  <motion.div
                    key={t.paint.name}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: t.weight === 0 ? 0.4 : 1, scale: 1 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="flex w-24 flex-col items-center gap-2 text-center"
                  >
                    <PaintGlob hex={t.paint.hex} name={t.paint.name} className="size-12" />
                    <div className="space-y-0.5">
                      {/* Two lines reserved, so a one-line name and a wrapped
                          one still line their pigment codes up with each other. */}
                      <div className="min-h-[2.5em] text-xs leading-tight font-medium">
                        {t.paint.name}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {t.weight === 0 ? "unused" : t.paint.pigment}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
              <CardFooter>
                <p className="text-xs text-muted-foreground">
                  {tubes.length === 1 ? "One tube" : `${tubes.length} tubes`}
                  {unusedCount > 0 && `, ${unusedCount} of them untouched by this picture`}.
                </p>
              </CardFooter>
            </Card>

            {reading ? (
              <p className="px-1 text-sm text-muted-foreground">Reading the photo…</p>
            ) : (
              <div className="space-y-6">
                {groups.map((group) => (
                  <section key={group.key}>
                    <div className="mb-3 flex items-baseline gap-2 px-1">
                      <h2 className="text-sm font-semibold tracking-tight">{group.label}</h2>
                      <Badge variant="secondary" className="text-[11px]">
                        {group.items.length}
                      </Badge>
                      <p className="ml-auto hidden text-xs text-muted-foreground sm:block">
                        {group.blurb}
                      </p>
                    </div>
                    <ul className="space-y-2">
                      {group.items.map((s, i) => {
                        const recipe = recipes.get(s.id)
                        return recipe ? (
                          <SwatchCard
                            key={s.id}
                            swatch={s}
                            recipe={recipe}
                            index={i}
                            active={active === s.id}
                            onActivate={setActive}
                          />
                        ) : null
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={copyPalette}>
                <Copy /> Copy palette and mixes
              </Button>
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  )
}

function Dropzone({
  onPick,
  onDrop,
  onBrowseSamples,
}: {
  onPick: () => void
  onDrop: (file: File | undefined) => void
  onBrowseSamples: () => void
}) {
  const [over, setOver] = React.useState(false)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        onDrop(Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/")))
      }}
      className={cn(
        "mx-auto flex max-w-2xl flex-col items-center gap-5 rounded-2xl border-2 border-dashed px-8 py-20 text-center transition-colors",
        over ? "border-ring bg-accent/40" : "border-border",
      )}
    >
      <div className="rounded-full border bg-card p-3 shadow-xs">
        <ImageUp className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold tracking-tight">Drop a photo in</h2>
        <p className="text-sm text-muted-foreground">
          Or paste one from the clipboard. Nothing leaves the browser — the photo is read on this
          machine and never uploaded.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={onPick}>
          <ImageUp /> Choose a photo
        </Button>
        <Button variant="outline" onClick={onBrowseSamples}>
          <Images /> Try a sample photo
        </Button>
      </div>
    </div>
  )
}

function SamplePicker({
  open,
  onOpenChange,
  onChoose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChoose: (choice: Sample) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pick a photo</DialogTitle>
          <DialogDescription>
            Each one puts a different problem in front of you.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          {SAMPLES.map((choice) => (
            <button
              key={choice.slug}
              type="button"
              onClick={() => onChoose(choice)}
              className="group overflow-hidden rounded-lg border text-left transition-colors hover:border-ring focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={choice.thumb}
                alt={choice.label}
                loading="lazy"
                className="aspect-4/3 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <span className="block px-2.5 py-2">
                <span className="block text-sm font-medium">{choice.label}</span>
                <span className="block text-xs text-muted-foreground">{choice.note}</span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Controls(props: {
  found: number
  count: number
  setCount: (n: number) => void
  fixedPalette: boolean
  paletteName: string
  maxPaints: number
  setMaxPaints: (n: number) => void
  grouping: Grouping
  setGrouping: (g: Grouping) => void
  allowWhite: boolean
  setAllowWhite: (b: boolean) => void
  allowBlack: boolean
  setAllowBlack: (b: boolean) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How to read it</CardTitle>
        <CardDescription>Set the palette the way you would actually lay it out.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="count">Colour groups</Label>
            <span className="font-mono text-sm text-muted-foreground">{props.count}</span>
          </div>
          <Slider
            id="count"
            min={3}
            max={14}
            step={1}
            value={props.count}
            onValueChange={(v) => props.setCount(Array.isArray(v) ? v[0] : v)}
          />
          <p className="text-xs text-muted-foreground">
            {props.found > 0 && props.found < props.count
              ? `This photo only holds ${props.found} colours you could tell apart, so the rest were folded in.`
              : "Fewer groups force bigger decisions. Six or seven is a normal day's palette."}
          </p>
        </div>

        <Separator />

        <div className="space-y-2.5">
          <Label>Tubes per mix</Label>
          <ToggleGroup
            variant="outline"
            spacing={0}
            value={[String(props.maxPaints)]}
            onValueChange={(v) => v[0] && props.setMaxPaints(Number(v[0]))}
          >
            {[1, 2, 3, 4].map((n) => (
              <ToggleGroupItem key={n} value={String(n)}>
                {n === 1 ? "Straight" : n}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="text-xs text-muted-foreground">
            More tubes get closer; three is about where a mix stays clean.
          </p>
        </div>

        <Separator />

        <div className="space-y-2.5">
          <Label>Group by</Label>
          <ToggleGroup
            variant="outline"
            spacing={0}
            value={[props.grouping]}
            onValueChange={(v) => v[0] && props.setGrouping(v[0] as Grouping)}
          >
            <ToggleGroupItem value="value">Value</ToggleGroupItem>
            <ToggleGroupItem value="temperature">Temperature</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Separator />

        <div className={cn("space-y-3", props.fixedPalette && "opacity-50")}>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="white" className="font-normal">
              Tint with Titanium White
            </Label>
            <Switch
              id="white"
              checked={props.allowWhite}
              onCheckedChange={props.setAllowWhite}
              disabled={props.fixedPalette}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="black" className="font-normal">
                Allow blacks and greys
              </Label>
              <p className="text-xs text-muted-foreground">
                {props.fixedPalette
                  ? `${props.paletteName} brings its own tubes.`
                  : "Off by default — darks mixed from colour stay alive."}
              </p>
            </div>
            <Switch
              id="black"
              checked={props.allowBlack}
              onCheckedChange={props.setAllowBlack}
              disabled={props.fixedPalette}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
