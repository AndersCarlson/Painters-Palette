# Painter's Palette

Drop in a photo and get the colour groups you would actually mix to paint it —
each one matched to real oil paints, with the ratios to get there.

**[anderscarlson.github.io/Painters-Palette](https://anderscarlson.github.io/Painters-Palette/)**

Everything runs in the browser. The photo is read on your own machine and never
uploaded.

## How it works

**Finding the colours.** The photo is reduced to a 32³ colour histogram, which
feeds weighted k-means with deterministic k-means++ seeding — the same photo
always gives the same palette. Clusters closer than ΔE 0.022 in OKLab are folded
together, so asking for seven groups on a flat photo gives you five rather than
two swatches nobody could tell apart.

**Mixing.** Paint does not mix like light. Mixtures here use Kubelka-Munk with
separate absorption and scattering terms, so blue into orange goes to mud, and a
dab of white into a dark barely shows while a dark into white swings it at once.
Tinting strength enters as concentration, which is why a touch of phthalo
carries a whole mixture. The catalogue holds 44 oil paints with their pigment
indices, opacity and relative strength.

**Choosing the palette.** You pick a palette first and every colour is mixed
from it: the **Zorn** four, **the Rembrandt** earths, a **three-colour primary**
triad, a **limited warm** or **limited cool** set, or the **full** rack.

Every swatch shows the photo colour against the mix, so the cost of the choice
is visible: the Zorn palette is uncanny on flesh and cannot reach a blue sky,
and the primary triad does the opposite.

**Picking by hand.** Click anywhere on the photo to read the colour there — a
small average rather than a single pixel — and it gets a mix of its own from
whichever palette is selected, alongside the colours found automatically.

## Running it

```bash
npm install
npm run dev
```

`npm run build` produces a static export in `out/`. `npm run build:pages` does
the same with the base path the GitHub Pages project site needs.

## Built on

Next.js (App Router), Tailwind v4, shadcn/ui (`base-nova`), IBM Plex,
next-themes and motion — the stock Monad foundation, with no custom tokens.
