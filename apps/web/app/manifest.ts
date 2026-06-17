import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NID Face Verification",
    short_name: "NID Face",
    description: "Face registration, identification, and verification for NID workflows.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#d9eeee",
    theme_color: "#52C2C3",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/nid-face-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/nid-face-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  }
}
