import { notFound } from "next/navigation";
import { BarDetailsClient } from "@/components/bar-details-client";
import { getBarBySlug, getBars } from "@/lib/bars";

export function generateStaticParams() {
  return getBars().map((bar) => ({ slug: bar.slug }));
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
