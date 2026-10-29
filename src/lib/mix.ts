import { deltaE, linearToHex, linearToOklab, type Lab } from "./color"
import { PAINTS, PAINT_BY_NAME, STAPLES, type Paint } from "./paints"

export type Component = {
  paint: Paint
  /** Brush-volume share of the mixture, 0..1. */
  volume: number
  /** That share rendered as parts against the smallest measurable one. */
  parts: number
  /** Below ~8% of the mixture: ask for a touch, not a measured part. */
  touch: boolean
}

export type Recipe = {
  components: Component[]
  hex: string
  lab: Lab
  deltaE: number
}

export type Dab = { paint: Paint; volume: number }

/**
 * Pigments mix by absorption and scattering, not by averaging light.
 * Kubelka-Munk pools each pigment's absorption (K) and scattering (S) in
 * proportion to how much of it is in the pile, and the mixture's reflectance
 * falls out of the ratio. It is what makes blue into orange go to mud, and what
 * makes a dab of white into a dark barely show while a dark into white swings
 * it at once — both things an arithmetic blend gets backwards.
 *
 * Tinting strength enters as concentration: a strong pigment puts more pigment
 * in the same dab, so a touch of phthalo carries a whole mixture.
 */
export function mixLinear(dabs: Dab[]): [number, number, number] {
  const k = [0, 0, 0]
  let s = 0
  for (const { paint, volume } of dabs) {
    if (volume <= 0) continue
    const c = volume * paint.strength
    const cs = c * paint.scatter
    s += cs
    for (let i = 0; i < 3; i++) k[i] += cs * paint.ks[i]
  }
  if (s === 0) return [0, 0, 0]
  return [0, 1, 2].map((i) => {
    const ratio = k[i] / s
    return 1 + ratio - Math.sqrt(ratio * ratio + 2 * ratio)
  }) as [number, number, number]
}

export function labOfMix(dabs: Dab[]): Lab {
  const [lr, lg, lb] = mixLinear(dabs)
  return linearToOklab(lr, lg, lb)
}

function toRecipe(dabs: Dab[], target: Lab): Recipe {
  const live = dabs.filter((d) => d.volume > 1e-6)
  const total = live.reduce((s, d) => s + d.volume, 0)
  const shares = live.map((d) => d.volume / total)

  // Parts read against the smallest share anyone would actually measure out;
  // anything under that gets called a touch instead of being given a number.
  const measurable = shares.filter((s) => s >= 0.08)
  const base = measurable.length ? Math.min(...measurable) : Math.min(...shares)

  const [lr, lg, lb] = mixLinear(live)
  const lab = linearToOklab(lr, lg, lb)

  return {
    components: live
      .map((d, i) => ({
        paint: d.paint,
        volume: shares[i],
        parts: Math.max(0.5, Math.round((shares[i] / base) * 2) / 2),
        touch: shares[i] < 0.08,
      }))
      // Colour first, white last — the order a painter would reach for them in.
      .sort((x, y) => Number(x.paint.isWhite) - Number(y.paint.isWhite) || y.volume - x.volume),
    hex: linearToHex(lr, lg, lb),
    lab,
    deltaE: deltaE(lab, target),
  }
}

// White carries most of the value range in oil, so its grid is dense up high.
const FINE = {
  ratios: [0.03, 0.08, 0.15, 0.25, 0.35, 0.5, 0.65, 0.75, 0.85, 0.92, 0.97],
  whites: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.68, 0.76, 0.82, 0.87, 0.91, 0.94, 0.97],
}

/** Positive compositions of 6 units across three pigments. */
const TRIPLE_WEIGHTS = [
  [4, 1, 1],
  [1, 4, 1],
  [1, 1, 4],
  [3, 2, 1],
  [3, 1, 2],
  [2, 3, 1],
  [1, 3, 2],
  [2, 1, 3],
  [1, 2, 3],
  [2, 2, 2],
]

export type SolveOptions = {
  maxPaints: number
  allowWhite: boolean
  allowBlack: boolean
  /** Restrict every mix to these tubes. Omitted: anything in the catalogue. */
  palette?: Paint[]
}

export function poolFor(opts: SolveOptions): Paint[] {
  if (opts.palette) return opts.palette
  return PAINTS.filter((p) => {
    if (p.isWhite) return opts.allowWhite
    if (p.family === "black") return opts.allowBlack
    return true
  })
}

function whiteOf(pool: Paint[], allowWhite: boolean): Paint | null {
  if (!allowWhite) return null
  return pool.find((p) => p.name === "Titanium White") ?? pool.find((p) => p.isWhite) ?? null
}

/**
 * Find the closest mixture to a target colour. Every extra tube pays a small
 * penalty, so a two-paint recipe only loses to a three-paint one when the third
 * tube buys an improvement you could actually see.
 */
export function solve(target: Lab, opts: SolveOptions): Recipe {
  const pool = poolFor(opts)
  const white = whiteOf(pool, opts.allowWhite)
  const ranked = [...pool]
    .map((p) => ({ p, d: deltaE(p.lab, target) }))
    .sort((x, y) => x.d - y.d)

  let best = toRecipe([{ paint: ranked[0].p, volume: 1 }], target)
  let bestScore = best.deltaE

  const consider = (dabs: Dab[], extraTubes: number) => {
    const score = deltaE(labOfMix(dabs), target) + extraTubes * 0.006
    if (score < bestScore) {
      bestScore = score
      best = toRecipe(dabs, target)
    }
  }

  for (const { p } of ranked) consider([{ paint: p, volume: 1 }], 0)
  if (opts.maxPaints < 2) return best

  const chromatic = ranked.map((r) => r.p).filter((p) => !p.isWhite)
  const candidates =
    opts.palette || chromatic.length <= 16
      ? chromatic
      : Array.from(
          new Set([
            ...chromatic.slice(0, 14),
            ...STAPLES.map((n) => PAINT_BY_NAME.get(n)!).filter(
              (p) => !p.isWhite && pool.includes(p),
            ),
          ]),
        )

  // One pigment tinted with white is the commonest recipe on any palette.
  if (white) {
    for (const p of candidates) {
      for (const f of FINE.whites) {
        consider([{ paint: p, volume: 1 - f }, { paint: white, volume: f }], 1)
      }
    }
  }

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      for (const r of FINE.ratios) {
        const core: Dab[] = [
          { paint: candidates[i], volume: r },
          { paint: candidates[j], volume: 1 - r },
        ]
        consider(core, 1)
        if (!white || opts.maxPaints < 3) continue
        for (const f of FINE.whites) {
          consider(
            [
              { paint: candidates[i], volume: r * (1 - f) },
              { paint: candidates[j], volume: (1 - r) * (1 - f) },
              { paint: white, volume: f },
            ],
            2,
          )
        }
      }
    }
  }

  if (opts.maxPaints < 3) return best

  const top = candidates.slice(0, 9)
  for (let i = 0; i < top.length; i++) {
    for (let j = i + 1; j < top.length; j++) {
      for (let k = j + 1; k < top.length; k++) {
        for (const w of TRIPLE_WEIGHTS) {
          const sum = w[0] + w[1] + w[2]
          const core: Dab[] = [
            { paint: top[i], volume: w[0] / sum },
            { paint: top[j], volume: w[1] / sum },
            { paint: top[k], volume: w[2] / sum },
          ]
          consider(core, 2)
          if (!white || opts.maxPaints < 4) continue
          for (const f of FINE.whites) {
            consider(
              [
                { paint: top[i], volume: (w[0] / sum) * (1 - f) },
                { paint: top[j], volume: (w[1] / sum) * (1 - f) },
                { paint: top[k], volume: (w[2] / sum) * (1 - f) },
                { paint: white, volume: f },
              ],
              3,
            )
          }
        }
      }
    }
  }

  return best
}

export function describeParts(c: Component): string {
  if (c.touch) return "a touch"
  return c.parts % 1 === 0 ? String(c.parts) : c.parts.toFixed(1)
}
