import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Comida di Buteco BH",
    short_name: "Buteco BH",
    description: "PWA local para explorar bares do Comida di Buteco em BH",
    start_url: "/",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#ffba45",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" }
    ]
  };
}
