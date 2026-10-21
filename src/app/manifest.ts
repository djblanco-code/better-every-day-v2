import type { MetadataRoute } from "next";

// Installable on a phone via "Add to Home Screen" (PRD: responsive web + PWA, no offline sync yet).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Better Every Day",
    short_name: "Better",
    description: "One hour a day: interview practice, applications, and the people who can help.",
    start_url: "/today",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1d4ed8",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
