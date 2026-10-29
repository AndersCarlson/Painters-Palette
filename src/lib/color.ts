// sRGB <-> linear <-> OKLab. OKLab is the working space for every distance
// measurement here: hue and lightness stay independent in it, so "same colour,
// lighter" and "different colour" don't get confused the way they do in sRGB.

export type Rgb = { r: number; g: number; b: number } // 0..255
export type Lab = { L: number; a: number; b: number } // OKLab

export function srgbToLinear(c: number): number {
  const u = c / 255
  return u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4)
}

export function linearToSrgb(u: number): number {
  const v = u <= 0.0031308 ? u * 12.92 : 1.055 * Math.pow(u, 1 / 2.4) - 0.055
  return Math.max(0, Math.min(255, Math.round(v * 255)))
}

export function rgbToOklab(r: number, g: number, b: number): Lab {
  return linearToOklab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b))
}

export function linearToOklab(lr: number, lg: number, lb: number): Lab {
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  }
}

export function oklabToLinear(lab: Lab): [number, number, number] {
  const l_ = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b
  const m_ = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b
  const s_ = lab.L - 0.0894841775 * lab.a - 1.291485548 * lab.b
  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

export function oklabToHex(lab: Lab): string {
  const [lr, lg, lb] = oklabToLinear(lab)
  return rgbToHex(linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb))
}

export function linearToHex(lr: number, lg: number, lb: number): string {
  return rgbToHex(linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb))
}

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase()
}

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "")
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

/** Perceptual distance in OKLab. ~0.02 is a hair, ~0.10 is a visible shift. */
export function deltaE(x: Lab, y: Lab): number {
  const dL = x.L - y.L
  const da = x.a - y.a
  const db = x.b - y.b
  return Math.sqrt(dL * dL + da * da + db * db)
}

export function chroma(lab: Lab): number {
  return Math.hypot(lab.a, lab.b)
}

/** Hue angle in degrees, 0 = toward red, rising through yellow and green. */
export function hueAngle(lab: Lab): number {
  const deg = (Math.atan2(lab.b, lab.a) * 180) / Math.PI
  return deg < 0 ? deg + 360 : deg
}

/** Text colour that stays legible on a given swatch. */
export function readableInk(lab: Lab): string {
  return lab.L > 0.62 ? "#15120F" : "#FBF9F5"
}
