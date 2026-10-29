import { hexToRgb, rgbToOklab, srgbToLinear, type Lab } from "./color"

export type PaintFamily =
  | "white"
  | "yellow"
  | "orange"
  | "red"
  | "earth"
  | "brown"
  | "green"
  | "blue"
  | "violet"
  | "black"

export type PaintOpacity = "opaque" | "semi-opaque" | "transparent"

export type PaintSpec = {
  name: string
  /** Pigment index as printed on the tube. */
  pigment: string
  /** Masstone, straight from the tube, as it reads on white ground. */
  hex: string
  family: PaintFamily
  opacity: PaintOpacity
  /**
   * Absorption per unit volume, relative to a cadmium at 1.0. Phthalo at 3.0
   * soaks up three times as much light from the same dab, which is why a touch
   * of it swings a whole mixture. Whites sit at 1.0: single-constant
   * Kubelka-Munk mixing cannot tell titanium from zinc, and does not try.
   */
  strength: number
}

export type Paint = PaintSpec & {
  lab: Lab
  linear: [number, number, number]
  /** The tube's own absorption-to-scattering ratio, per channel. */
  ks: [number, number, number]
  /**
   * How much light the pigment bounces back rather than swallowing. An opaque
   * cadmium scatters several times what a transparent alizarin does, and
   * titanium white scatters so hard it is the only reason a tint lightens at
   * all — which is why it sits two orders of magnitude up the scale.
   */
  scatter: number
  isWhite: boolean
}

const SCATTER: Record<PaintOpacity, number> = {
  opaque: 3,
  "semi-opaque": 1.5,
  transparent: 0.6,
}

const SPECS: PaintSpec[] = [
  { name: "Titanium White", pigment: "PW6", hex: "#F7F6F2", family: "white", opacity: "opaque", strength: 1.0 },
  { name: "Zinc White", pigment: "PW4", hex: "#F6F4EA", family: "white", opacity: "semi-opaque", strength: 1.0 },

  { name: "Cadmium Lemon", pigment: "PY35", hex: "#F6E84F", family: "yellow", opacity: "opaque", strength: 1.0 },
  { name: "Hansa Yellow", pigment: "PY3", hex: "#F7DA2B", family: "yellow", opacity: "semi-opaque", strength: 1.3 },
  { name: "Cadmium Yellow Light", pigment: "PY35", hex: "#FFD22E", family: "yellow", opacity: "opaque", strength: 1.0 },
  { name: "Cadmium Yellow Deep", pigment: "PY35", hex: "#FBAE17", family: "yellow", opacity: "opaque", strength: 1.0 },
  { name: "Naples Yellow", pigment: "PY41", hex: "#EBCE86", family: "yellow", opacity: "opaque", strength: 0.7 },
  { name: "Indian Yellow", pigment: "PY139", hex: "#E79C1E", family: "yellow", opacity: "transparent", strength: 1.5 },
  { name: "Yellow Ochre", pigment: "PY43", hex: "#B9862F", family: "earth", opacity: "opaque", strength: 0.8 },
  { name: "Raw Sienna", pigment: "PBr7", hex: "#A5692A", family: "earth", opacity: "semi-opaque", strength: 0.9 },

  { name: "Cadmium Orange", pigment: "PO20", hex: "#F2731C", family: "orange", opacity: "opaque", strength: 1.0 },
  { name: "Vermilion", pigment: "PR106", hex: "#D93A22", family: "red", opacity: "opaque", strength: 1.0 },
  { name: "Cadmium Red Light", pigment: "PR108", hex: "#E03A1B", family: "red", opacity: "opaque", strength: 1.0 },
  { name: "Cadmium Red Deep", pigment: "PR108", hex: "#BC1F2A", family: "red", opacity: "opaque", strength: 1.0 },
  { name: "Alizarin Crimson", pigment: "PR83", hex: "#8E1C2E", family: "red", opacity: "transparent", strength: 1.6 },
  { name: "Permanent Rose", pigment: "PV19", hex: "#C02A5E", family: "red", opacity: "transparent", strength: 1.7 },
  { name: "Quinacridone Magenta", pigment: "PR122", hex: "#9C2566", family: "red", opacity: "transparent", strength: 1.8 },
  { name: "Venetian Red", pigment: "PR101", hex: "#8F3A2D", family: "earth", opacity: "opaque", strength: 0.9 },
  { name: "Indian Red", pigment: "PR101", hex: "#7A332E", family: "earth", opacity: "opaque", strength: 0.9 },
  { name: "Burnt Sienna", pigment: "PBr7", hex: "#7A3E29", family: "earth", opacity: "semi-opaque", strength: 1.0 },
  { name: "Transparent Red Oxide", pigment: "PR101", hex: "#8A3A1E", family: "earth", opacity: "transparent", strength: 1.3 },

  { name: "Raw Umber", pigment: "PBr7", hex: "#6A5537", family: "brown", opacity: "semi-opaque", strength: 1.0 },
  { name: "Burnt Umber", pigment: "PBr7", hex: "#45291D", family: "brown", opacity: "semi-opaque", strength: 1.1 },
  { name: "Van Dyke Brown", pigment: "PBr7", hex: "#3E2A1E", family: "brown", opacity: "transparent", strength: 1.2 },

  { name: "Cadmium Green", pigment: "PG50", hex: "#3E8C5A", family: "green", opacity: "opaque", strength: 1.0 },
  { name: "Chromium Oxide Green", pigment: "PG17", hex: "#67805A", family: "green", opacity: "opaque", strength: 0.8 },
  { name: "Terre Verte", pigment: "PG23", hex: "#5C6A4C", family: "green", opacity: "transparent", strength: 0.5 },
  { name: "Sap Green", pigment: "PG7/PY83", hex: "#49621F", family: "green", opacity: "transparent", strength: 1.4 },
  { name: "Olive Green", pigment: "PG7/PY42", hex: "#545A2A", family: "green", opacity: "semi-opaque", strength: 1.2 },
  { name: "Viridian", pigment: "PG18", hex: "#12755F", family: "green", opacity: "transparent", strength: 1.2 },
  { name: "Phthalo Green", pigment: "PG7", hex: "#0A4E3E", family: "green", opacity: "transparent", strength: 3.0 },

  { name: "Manganese Blue Hue", pigment: "PB15:3", hex: "#1C8FB4", family: "blue", opacity: "semi-opaque", strength: 1.6 },
  { name: "Cerulean Blue", pigment: "PB35", hex: "#2B7EB6", family: "blue", opacity: "opaque", strength: 0.9 },
  { name: "Cobalt Blue", pigment: "PB28", hex: "#1F4C9C", family: "blue", opacity: "semi-opaque", strength: 1.0 },
  { name: "Ultramarine Blue", pigment: "PB29", hex: "#29368C", family: "blue", opacity: "transparent", strength: 1.3 },
  { name: "Phthalo Blue", pigment: "PB15:3", hex: "#0C3C8E", family: "blue", opacity: "transparent", strength: 3.0 },
  { name: "Prussian Blue", pigment: "PB27", hex: "#11324B", family: "blue", opacity: "transparent", strength: 2.2 },
  { name: "Indanthrone Blue", pigment: "PB60", hex: "#1E2A4F", family: "blue", opacity: "transparent", strength: 1.8 },

  { name: "Cobalt Violet", pigment: "PV14", hex: "#6B3F9E", family: "violet", opacity: "semi-opaque", strength: 0.9 },
  { name: "Dioxazine Purple", pigment: "PV23", hex: "#3A1D50", family: "violet", opacity: "transparent", strength: 2.5 },

  { name: "Payne's Grey", pigment: "PB29/PBk9", hex: "#3C4A57", family: "black", opacity: "semi-opaque", strength: 1.3 },
  { name: "Davy's Grey", pigment: "PBk19", hex: "#6D6E68", family: "black", opacity: "semi-opaque", strength: 0.6 },
  { name: "Ivory Black", pigment: "PBk9", hex: "#221F1F", family: "black", opacity: "semi-opaque", strength: 1.4 },
  { name: "Mars Black", pigment: "PBk11", hex: "#1A1A1A", family: "black", opacity: "opaque", strength: 1.6 },
]

export const PAINTS: Paint[] = SPECS.map((spec) => {
  const { r, g, b } = hexToRgb(spec.hex)
  // Reflectance held inside (0, 1) so the K/S transform stays finite at both ends.
  const linear = [r, g, b].map((v) => Math.min(0.995, Math.max(0.004, srgbToLinear(v)))) as [
    number,
    number,
    number,
  ]
  const isWhite = spec.family === "white"
  return {
    ...spec,
    lab: rgbToOklab(r, g, b),
    linear,
    ks: linear.map((R) => (1 - R) ** 2 / (2 * R)) as [number, number, number],
    scatter: isWhite ? 20 : SCATTER[spec.opacity],
    isWhite,
  }
})

export const PAINT_BY_NAME = new Map(PAINTS.map((p) => [p.name, p]))

/** Tubes a solver should always be able to reach for, whatever the target. */
export const STAPLES = [
  "Titanium White",
  "Ivory Black",
  "Burnt Umber",
  "Burnt Sienna",
  "Yellow Ochre",
  "Ultramarine Blue",
  "Alizarin Crimson",
]

export const FAMILY_ORDER: PaintFamily[] = [
  "white",
  "yellow",
  "orange",
  "red",
  "earth",
  "brown",
  "green",
  "blue",
  "violet",
  "black",
]
