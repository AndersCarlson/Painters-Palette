import { PaintersPalette } from "@/components/painters-palette"

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="max-w-2xl space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Work out the palette for a photo
        </h1>
        <p className="text-muted-foreground">
          Drop in a reference and it comes back sorted into the colour groups you would actually mix
          — each one matched to a real oil paint, with the ratios to get there.
        </p>
      </div>
      <PaintersPalette />
    </div>
  )
}
