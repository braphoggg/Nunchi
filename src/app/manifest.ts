import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Room 203 — Korean with Moon-jo",
    short_name: "Room 203",
    description:
      "Learn Korean with Seo Moon-jo, the dentist from Room 203 at Eden Goshiwon.",
    start_url: "/",
    display: "standalone",
    background_color: "#1a1a1a",
    theme_color: "#8b2500",
    orientation: "portrait",
    categories: ["education", "lifestyle"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
