import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Drop",
    short_name: "Drop",
    description: "Habits on the beat",
    start_url: "/",
    display: "standalone",
    background_color: "#07081a",
    theme_color: "#07081a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
