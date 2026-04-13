import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BarDetailsClient } from "@/components/bar-details-client";
import { getBarBySlug, getBars } from "@/lib/bars";

export function generateStaticParams() {
  return getBars().map((bar) => ({ slug: bar.slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bar = getBarBySlug(slug);

  if (!bar) {
    return {
      title: "Bar não encontrado • Comida di Buteco BH",
      description: "Bar não encontrado."
    };
  }

  const title = `${bar.nome} • Comida di Buteco BH`;
  const description = `${bar.petiscoDescricao} • ${bar.endereco} • ${bar.cidade}/${bar.estado}`;
  const pageUrl = `/bar/${bar.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: pageUrl,
      images: [
        {
          url: bar.imagemUrl,
          alt: `Prato ${bar.petiscoDescricao} no ${bar.nome}`
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [bar.imagemUrl]
    }
  };
}

export default async function BarDetailsPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bar = getBarBySlug(slug);

  if (!bar) {
    notFound();
  }

  return <BarDetailsClient bar={bar} />;
}
