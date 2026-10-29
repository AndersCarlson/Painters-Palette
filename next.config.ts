import type { NextConfig } from "next";

// GitHub Pages serves a project site from /<repo>, so the build that goes there
// needs every asset URL prefixed. Dev and plain local builds leave it empty and
// stay at the root; the Pages workflow sets it (see `build:pages`).
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // The whole tool runs in the browser, so it ships as static files.
  output: "export",
  basePath,
  // Same prefix, readable from the client, for URLs the app builds itself.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: {
    // No image optimiser exists behind a static export.
    unoptimized: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
