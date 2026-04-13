"use client";

import Link from "next/link";
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
  distanceKm,
  currentRating,
  onRate,
  onOpenImage
}: BarCardProps) {
  return (
    <article className="bar-card">
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
      {typeof distanceKm === "number" && <p className="meta-line">{distanceKm.toFixed(1)} km</p>}

      <div className="card-actions">
        <button
          className={currentRating === "like" ? "active-like" : ""}
          onClick={() => onRate(bar, "like")}
        >
          Like
        </button>
        <button
          className={currentRating === "dislike" ? "active-dislike" : ""}
          onClick={() => onRate(bar, "dislike")}
        >
          Dislike
        </button>
        <a href={bar.mapsUrl} target="_blank" rel="noreferrer">
          Maps
        </a>
      </div>
    </article>
  );
}
