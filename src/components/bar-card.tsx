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
  onShare: (barId: string) => void;
};

export function BarCard({
  bar,
  userLat,
  userLng,
  distanceKm,
  currentRating,
  onRate,
  onOpenImage,
  onShare
}: BarCardProps) {
  const hasUserLocation = typeof userLat === "number" && typeof userLng === "number";

  return (
    <article id={`bar-card-${bar.id}`} className="bar-card">
      <button className="bar-image-button" onClick={() => onOpenImage(bar)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bar.imagemUrl} alt={bar.nome} className="bar-image" loading="lazy" />
        {currentRating === "like" && <span className="card-badge">Must try ★</span>}
        <span className="image-hint">Ampliar</span>
      </button>

      <div className="card-body">
        <Link href={`/bar/${bar.slug}`} className="bar-card-link">
          <h3 className="card-name">{bar.nome}</h3>
          <p className="card-dish">{bar.petiscoDescricao}</p>
        </Link>

        {hasUserLocation && (
          <p className="card-meta">
            {typeof distanceKm === "number" ? `${distanceKm.toFixed(1)} km de você` : "Distância indisponível"}
          </p>
        )}

        <Link href={`/bar/${bar.slug}`} className="card-details-link">
          Ver detalhes →
        </Link>

        <div className="card-actions">
          <div className="card-actions-left">
            <button
              className={`card-icon-btn ${currentRating === "like" ? "active-like" : ""}`}
              onClick={() => onRate(bar, "like")}
              aria-label="Curtir"
            >
              <AppIcon name="favorite" size={18} />
            </button>
            <button
              className={`card-icon-btn ${currentRating === "dislike" ? "active-dislike" : ""}`}
              onClick={() => onRate(bar, "dislike")}
              aria-label="Não curtir"
            >
              <AppIcon name="thumb-down" size={18} />
            </button>
            <button className="card-icon-btn" onClick={() => onShare(bar.id)} aria-label="Compartilhar bar">
              <AppIcon name="share" size={18} />
            </button>
          </div>
          <a href={bar.mapsUrl} target="_blank" rel="noreferrer" className="maps-cta">
            <AppIcon name="map" size={15} />
            Google Maps
          </a>
        </div>
      </div>
    </article>
  );
}
