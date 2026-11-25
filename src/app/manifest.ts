import type { MetadataRoute } from "next";

// "Add to home screen": served at /manifest.webmanifest, linked from every page by Next.js.
// Colours are --paper from globals.css (a manifest cannot read CSS variables).
// Icons are the bucket-hat snowman cut-out on paper (public/icons/); the maskable one has extra paper around it
// so Android's round or squircle mask never clips the bucket. No service worker: nothing is cached offline.
const PAPER = "#fffdf8";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Plop!",
    short_name: "Plop",
    description: "Paper bowling on snow: pull a snowman back, roll a snowball bigger, let go. Plop!",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: PAPER,
    theme_color: PAPER,
    icons: [
      { src: "/icons/plop-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/plop-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/plop-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
