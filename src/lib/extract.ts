import { chroma, deltaE, hueAngle, linearToOklab, oklabToHex, srgbToLinear, type Lab } from "./color"

export type Swatch = {
  id: number
  lab: Lab
  hex: string
  /** Share of the canvas this colour covers, 0..1. */
  share: number
  /** Where in the photo it is most typical — 0..1 of width and height. */
  spot: { x: number; y: number }
}

export type ValueBand = "shadow" | "midtone" | "light" | "highlight"
export type Temperature = "warm" | "cool" | "neutral"

export function valueBand(lab: Lab): ValueBand {
  if (lab.L < 0.42) return "shadow"
  if (lab.L < 0.68) return "midtone"
  if (lab.L < 0.86) return "light"
  return "highlight"
}

export function temperature(lab: Lab): Temperature {
  if (chroma(lab) < 0.025) return "neutral"
  const h = hueAngle(lab)
  // Reds through yellow-greens read warm; the greens past that, and the blues
  // and violets, read cool.
  return h < 125 || h > 335 ? "warm" : "cool"
}

export const VALUE_BANDS: { key: ValueBand; label: string; blurb: string }[] = [
  { key: "shadow", label: "Shadows", blurb: "Darkest masses — mix these transparent and thin" },
  { key: "midtone", label: "Midtones", blurb: "The bulk of the picture, where the drawing lives" },
  { key: "light", label: "Lights", blurb: "Lit planes turning toward the source" },
  { key: "highlight", label: "Highlights", blurb: "Thickest paint, laid in last" },
]

export const TEMPERATURES: { key: Temperature; label: string; blurb: string }[] = [
  { key: "warm", label: "Warm", blurb: "Reds, oranges, yellows — these come forward" },
  { key: "cool", label: "Cool", blurb: "Greens, blues, violets — these recede" },
  { key: "neutral", label: "Neutral", blurb: "Near-greys that hold the warms and cools apart" },
]

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Bin = { lab: Lab; count: number; x: number; y: number }

/**
 * Collapse the pixels into a 32³ colour histogram first. Clustering a few
 * thousand weighted bins instead of 60k pixels is an order of magnitude faster
 * and lands in the same place, because k-means only ever sees sums anyway.
 */
function histogram(data: Uint8ClampedArray, w: number, h: number): Bin[] {
  const bins = new Map<number, { L: number; a: number; b: number; n: number; x: number; y: number }>()
  for (let p = 0, i = 0; p < data.length; p += 4, i++) {
    if (data[p + 3] < 128) continue
    const r = data[p]
    const g = data[p + 1]
    const b = data[p + 2]
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
    const lab = linearToOklab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b))
    const hit = bins.get(key)
    const x = (i % w) / w
    const y = Math.floor(i / w) / h
    if (hit) {
      hit.L += lab.L
      hit.a += lab.a
      hit.b += lab.b
      hit.n++
      hit.x += x
      hit.y += y
    } else {
      bins.set(key, { L: lab.L, a: lab.a, b: lab.b, n: 1, x, y })
    }
  }
  return Array.from(bins.values()).map((v) => ({
    lab: { L: v.L / v.n, a: v.a / v.n, b: v.b / v.n },
    count: v.n,
    x: v.x / v.n,
    y: v.y / v.n,
  }))
}

/** k-means++ seeding, deterministic so the same photo always gives the same palette. */
function seed(bins: Bin[], k: number): Lab[] {
  const rand = mulberry32(0x9e3779b9)
  const total = bins.reduce((s, b) => s + b.count, 0)
  const pickWeighted = (weights: number[], sum: number) => {
    let r = rand() * sum
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i]
      if (r <= 0) return i
    }
    return weights.length - 1
  }

  const centres: Lab[] = [bins[pickWeighted(bins.map((b) => b.count), total)].lab]
  while (centres.length < k) {
    const weights = bins.map((b) => {
      let nearest = Infinity
      for (const c of centres) nearest = Math.min(nearest, deltaE(b.lab, c))
      return b.count * nearest * nearest
    })
    const sum = weights.reduce((s, w) => s + w, 0)
    if (sum <= 0) break
    centres.push(bins[pickWeighted(weights, sum)].lab)
  }
  return centres
}

export function extractSwatches(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  k: number,
): Swatch[] {
  const bins = histogram(data, width, height)
  if (!bins.length) return []

  const kk = Math.min(k, bins.length)
  let centres = seed(bins, kk)

  const assign = new Int32Array(bins.length)
  for (let iter = 0; iter < 24; iter++) {
    let moved = false
    for (let i = 0; i < bins.length; i++) {
      let bestIdx = 0
      let bestD = Infinity
      for (let c = 0; c < centres.length; c++) {
        const d = deltaE(bins[i].lab, centres[c])
        if (d < bestD) {
          bestD = d
          bestIdx = c
        }
      }
      if (assign[i] !== bestIdx) {
        assign[i] = bestIdx
        moved = true
      }
    }

    const acc = centres.map(() => ({ L: 0, a: 0, b: 0, n: 0 }))
    for (let i = 0; i < bins.length; i++) {
      const a = acc[assign[i]]
      const { lab, count } = bins[i]
      a.L += lab.L * count
      a.a += lab.a * count
      a.b += lab.b * count
      a.n += count
    }
    centres = centres.map((c, i) =>
      acc[i].n ? { L: acc[i].L / acc[i].n, a: acc[i].a / acc[i].n, b: acc[i].b / acc[i].n } : c,
    )
    if (!moved) break
  }

  const totals = centres.map(() => ({ n: 0, bestD: Infinity, x: 0.5, y: 0.5 }))
  for (let i = 0; i < bins.length; i++) {
    const t = totals[assign[i]]
    t.n += bins[i].count
    const d = deltaE(bins[i].lab, centres[assign[i]])
    if (d < t.bestD) {
      t.bestD = d
      t.x = bins[i].x
      t.y = bins[i].y
    }
  }

  const grand = totals.reduce((s, t) => s + t.n, 0) || 1
  const raw = centres
    .map((lab, i) => ({ lab, n: totals[i].n, spot: { x: totals[i].x, y: totals[i].y } }))
    .filter((c) => c.n / grand > 0.0015)

  return merge(raw)
    .sort((a, b) => b.lab.L - a.lab.L)
    .map((c, i) => ({
      id: i,
      lab: c.lab,
      hex: oklabToHex(c.lab),
      share: c.n / grand,
      spot: c.spot,
    }))
}

/** Two clusters this close are the same decision at the easel. */
const MERGE_THRESHOLD = 0.022

type Cluster = { lab: Lab; n: number; spot: { x: number; y: number } }

/**
 * k-means will happily split one colour mass in two when asked for more groups
 * than the photo holds. A painter gains nothing from two swatches they could
 * not tell apart, so fold those back together and let the count come in under
 * what was asked.
 */
function merge(clusters: Cluster[]): Cluster[] {
  const out: Cluster[] = []
  for (const c of [...clusters].sort((a, b) => b.n - a.n)) {
    const hit = out.find((o) => deltaE(o.lab, c.lab) < MERGE_THRESHOLD)
    if (!hit) {
      out.push({ ...c })
      continue
    }
    const total = hit.n + c.n
    hit.lab = {
      L: (hit.lab.L * hit.n + c.lab.L * c.n) / total,
      a: (hit.lab.a * hit.n + c.lab.a * c.n) / total,
      b: (hit.lab.b * hit.n + c.lab.b * c.n) / total,
    }
    hit.n = total
  }
  return out
}

/**
 * The colour at one point of the photo, averaged over a few pixels so a single
 * noisy one cannot decide it — which is what a painter does by eye anyway,
 * reading the local colour rather than a speck of it. Averaged in linear light,
 * since that is how the light actually adds up.
 */
export function readColourAt(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  nx: number,
  ny: number,
  radius = 2,
): Lab {
  const cx = Math.min(width - 1, Math.max(0, Math.round(nx * (width - 1))))
  const cy = Math.min(height - 1, Math.max(0, Math.round(ny * (height - 1))))
  let r = 0
  let g = 0
  let b = 0
  let n = 0

  for (let y = cy - radius; y <= cy + radius; y++) {
    if (y < 0 || y >= height) continue
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (x < 0 || x >= width) continue
      const i = (y * width + x) * 4
      if (data[i + 3] < 128) continue
      r += srgbToLinear(data[i])
      g += srgbToLinear(data[i + 1])
      b += srgbToLinear(data[i + 2])
      n++
    }
  }

  if (!n) return { L: 0, a: 0, b: 0 }
  return linearToOklab(r / n, g / n, b / n)
}
