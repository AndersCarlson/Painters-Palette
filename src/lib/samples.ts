/**
 * GitHub Pages serves this from /<repo>, so anything fetched by hand — rather
 * than through an import the bundler rewrites — has to carry the prefix itself.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

export function asset(path: string): string {
  return `${BASE_PATH}${path}`
}

export type Sample = {
  slug: string
  label: string
  /** What a painter would have to solve in it. */
  note: string
  src: string
  thumb: string
}

function sample(slug: string, label: string, note: string): Sample {
  return {
    slug,
    label,
    note,
    src: asset(`/samples/${slug}.webp`),
    thumb: asset(`/samples/${slug}-thumb.webp`),
  }
}

export const SAMPLES: Sample[] = [
  sample("canyon-creek", "Side creek", "Warm rock against green water"),
  sample("river-narrows", "River narrows", "Reflected light in deep shade"),
  sample("canyon-rapids", "Rapids", "Sunlit rim over cool shadow"),
  sample("first-snow", "First snow", "Near-white lights, blue shadows"),
  sample("desert-towers", "Desert towers", "Red rock under a clean sky"),
]
