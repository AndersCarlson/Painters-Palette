import { PAINT_BY_NAME, type Paint } from "./paints"

/**
 * A palette is a decision made before the first brushstroke. These are the ones
 * painters actually make: the historical sets, the primary triad, and the two
 * halves of the colour wheel. Picking one narrows what any colour can become,
 * which is the whole point — and the match badges show what it costs.
 */
export type PaletteId =
  | "auto"
  | "zorn"
  | "rembrandt"
  | "primary"
  | "warm"
  | "cool"
  | "full"

export type PaletteOption = {
  id: PaletteId
  name: string
  /** What the segmented control shows — seven full names would not fit. */
  short: string
  note: string
  /** Fixed tubes, by name. Omitted when the palette is worked out instead. */
  paints?: string[]
}

export const PALETTE_OPTIONS: PaletteOption[] = [
  {
    id: "auto",
    name: "For this photo",
    short: "This photo",
    note: "Worked out from the photo — the tubes that each buy the most.",
  },
  {
    id: "zorn",
    name: "Zorn",
    short: "Zorn",
    note: "Four tubes, with black standing in for blue. Astonishing for flesh.",
    paints: ["Titanium White", "Yellow Ochre", "Vermilion", "Ivory Black"],
  },
  {
    id: "rembrandt",
    name: "The Rembrandt",
    short: "Rembrandt",
    note: "Earths, lead white and a red lake. Almost no blue at all.",
    paints: [
      "Titanium White",
      "Naples Yellow",
      "Yellow Ochre",
      "Vermilion",
      "Alizarin Crimson",
      "Raw Umber",
      "Burnt Umber",
      "Ivory Black",
    ],
  },
  {
    id: "primary",
    name: "The 3-Colour Primary",
    short: "Primary",
    note: "Three primaries and white. Everything else you mix yourself.",
    paints: ["Titanium White", "Hansa Yellow", "Quinacridone Magenta", "Phthalo Blue"],
  },
  {
    id: "warm",
    name: "Limited Warm",
    short: "Warm",
    note: "The warm side of each primary, plus two earths.",
    paints: [
      "Titanium White",
      "Cadmium Yellow Deep",
      "Cadmium Red Light",
      "Yellow Ochre",
      "Burnt Sienna",
      "Ultramarine Blue",
    ],
  },
  {
    id: "cool",
    name: "Limited Cool",
    short: "Cool",
    note: "The cool side of each primary. Everything recedes.",
    paints: [
      "Titanium White",
      "Cadmium Lemon",
      "Permanent Rose",
      "Cerulean Blue",
      "Phthalo Blue",
      "Viridian",
    ],
  },
  {
    id: "full",
    name: "Full",
    short: "Full",
    note: "The whole rack. Every colour matched on its own, however many tubes that takes.",
  },
]

export const PALETTE_BY_ID = new Map(PALETTE_OPTIONS.map((p) => [p.id, p]))

/** The fixed tubes of a preset, or undefined when there are none to fix. */
export function paintsOf(id: PaletteId): Paint[] | undefined {
  const names = PALETTE_BY_ID.get(id)?.paints
  return names?.map((n) => PAINT_BY_NAME.get(n)!)
}
