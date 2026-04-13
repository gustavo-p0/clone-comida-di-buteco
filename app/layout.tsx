import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  title: "Comida di Buteco - BH",
  description: "Lista de bares do Comida di Buteco com mapa e avaliações locais",
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  openGraph: {
    title: "Comida di Buteco - BH",
    description: "Lista de bares do Comida di Buteco com mapa e avaliações locais",
    type: "website",
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: "Comida di Buteco - BH",
    description: "Lista de bares do Comida di Buteco com mapa e avaliações locais"
  }
};

export const viewport: Viewport = {
  themeColor: "#ffba45"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
