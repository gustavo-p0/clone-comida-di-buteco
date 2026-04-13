import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comida di Buteco - BH",
  description: "Lista de bares do Comida di Buteco com mapa e avaliações locais"
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
