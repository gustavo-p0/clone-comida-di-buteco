"use client";

import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import { Bar, RatingValue } from "@/types/bar";

type BarCardProps = {
  bar: Bar;
  userLat: number | null;
  userLng: number | null;
  distanceKm: number | null;
  currentRating?: RatingValue;
  onRate: (bar: Bar, rating: RatingValue) => void;
  onOpenImage: (bar: Bar) => void;
};

export function BarCard({
  bar,
  userLat,
  userLng,
  distanceKm,
  currentRating,
  onRate,
  onOpenImage
}: BarCardProps) {
  const hasUserLocation = typeof userLat === "number" && typeof userLng === "number";

  return (
    <article id={`bar-card-${bar.id}`} className="bar-card">
      <button className="bar-image-button" onClick={() => onOpenImage(bar)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bar.imagemUrl} alt={bar.nome} className="bar-image" loading="lazy" />
        <span className="image-hint">Ampliar</span>
      </button>

      <Link href={`/bar/${bar.slug}`} className="bar-card-link">
        <h3>{bar.nome}</h3>
        <p className="dish-description">{bar.petiscoDescricao}</p>
      </Link>

      <p className="meta-line">{bar.endereco}</p>
      {hasUserLocation && (
        <p className="meta-line">
          {typeof distanceKm === "number" ? `${distanceKm.toFixed(1)} km de você` : "Distância indisponível"}
        </p>
      )}

      <div className="card-actions">
        <button
          className={currentRating === "like" ? "active-like" : ""}
          onClick={() => onRate(bar, "like")}
          aria-label="Curtir"
        >
          <AppIcon name="favorite" size={16} />
          <span>Like</span>
        </button>
        <button
          className={currentRating === "dislike" ? "active-dislike" : ""}
          onClick={() => onRate(bar, "dislike")}
          aria-label="Não curtir"
        >
          <AppIcon name="thumb-down" size={16} />
          <span>Dislike</span>
        </button>
        <a href={bar.mapsUrl} target="_blank" rel="noreferrer">
          <AppIcon name="map" size={16} />
          <span>Google Maps</span>
        </a>
      </div>
    </article>
  );
}
