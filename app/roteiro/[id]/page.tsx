import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBars } from "@/lib/bars";
import { getSharedRoute, isSharedRouteStoreConfigured } from "@/lib/shared-route-store";
import { Bar } from "@/types/bar";

export const dynamic = "force-dynamic";

function buildDefaultTitle(barCount: number) {
  return `Meu roteiro de boteco (${barCount})`;
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!isSharedRouteStoreConfigured()) {
    return {
      title: "Roteiro compartilhado • Comida di Buteco BH",
      description: "Roteiro compartilhado em modo somente leitura."
    };
  }

  const sharedRoute = await getSharedRoute(id);
  if (!sharedRoute) {
    return {
      title: "Roteiro não encontrado • Comida di Buteco BH",
      description: "Esse roteiro pode ter expirado."
    };
  }

  const title = sharedRoute.title || buildDefaultTitle(sharedRoute.barIds.length);
  return {
    title: `${title} • Comida di Buteco BH`,
    description: `Roteiro compartilhado com ${sharedRoute.barIds.length} paradas de boteco.`
  };
}

export default async function SharedRoutePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSharedRouteStoreConfigured()) {
    return (
      <main className="shared-route-root">
        <section className="shared-route-header">
          <h1>Compartilhamento indisponível</h1>
          <p>Esse ambiente ainda não está com o Upstash configurado.</p>
          <Link href="/" className="shared-route-primary-btn">
            Voltar para a lista
          </Link>
        </section>
      </main>
    );
  }

  const sharedRoute = await getSharedRoute(id);
  if (!sharedRoute) {
    notFound();
  }

  const barsById = getBars().reduce<Record<string, Bar>>((accumulator, bar) => {
    accumulator[bar.id] = bar;
    return accumulator;
  }, {});

  const routeBars = sharedRoute.barIds.map((barId) => barsById[barId]).filter((bar): bar is Bar => Boolean(bar));
  const title = sharedRoute.title || buildDefaultTitle(routeBars.length);

  return (
    <main className="shared-route-root">
      <section className="shared-route-header">
        <p className="shared-route-eyebrow">Meu roteiro de buteco</p>
        <h1>{title}</h1>
        <p>Uma jornada compartilhada para rodar bares sem perder nenhuma parada.</p>
      </section>

      <section className="shared-route-timeline" aria-label="Paradas do roteiro">
        {routeBars.map((bar, index) => (
          <article key={bar.id} className="shared-route-card">
            <p className="shared-route-step">{`Parada ${index + 1}`}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bar.imagemUrl} alt={bar.nome} className="shared-route-image" loading="lazy" />
            <h2>{bar.nome}</h2>
            <p className="shared-route-dish">{bar.petiscoDescricao}</p>
            <p className="shared-route-address">{bar.endereco}</p>
            <div className="shared-route-actions">
              <Link href={`/bar/${bar.slug}`} className="shared-route-chip">
                Ver detalhes
              </Link>
              <a href={bar.mapsUrl} target="_blank" rel="noreferrer" className="shared-route-chip">
                Google Maps
              </a>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
