"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ImageModal } from "@/components/image-modal";
import { readRatings, saveRatings } from "@/lib/rating-storage";
import { Bar, RatingValue, StoredRating } from "@/types/bar";

type BarDetailsClientProps = {
  bar: Bar;
};

export function BarDetailsClient({ bar }: BarDetailsClientProps) {
  const [ratings, setRatings] = useState<StoredRating[]>(() => readRatings());
  const [showImage, setShowImage] = useState(false);
  const currentRating = useMemo(
    () => ratings.find((item) => item.barId === bar.id)?.rating,
    [bar.id, ratings]
  );

  function rate(rating: RatingValue) {
    const next = [
      ...ratings.filter((item) => item.barId !== bar.id),
      {
        barId: bar.id,
        barName: bar.nome,
        rating,
        dishName: bar.petiscoDescricao,
        savedAt: new Date().toISOString(),
        lat: bar.latitude,
        lng: bar.longitude,
        imageUrl: bar.imagemUrl
      }
    ];
    setRatings(next);
    saveRatings(next);
  }

  return (
    <main className="details-root">
      <header className="details-header">
        <Link href="/">Voltar</Link>
        <h1>{bar.nome}</h1>
      </header>

      <button className="bar-image-button" onClick={() => setShowImage(true)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bar.imagemUrl} alt={bar.nome} className="details-image" />
        <span className="image-hint">Toque para ampliar</span>
      </button>

      <section className="details-body">
        <h2>Prato</h2>
        <p>{bar.petiscoDescricao}</p>

        <h2>Endereço</h2>
        <p>{bar.endereco}</p>

        {bar.complemento ? (
          <>
            <h2>Complemento</h2>
            <p>{bar.complemento}</p>
          </>
        ) : null}

        {bar.telefone ? (
          <>
            <h2>Telefone</h2>
            <p>{bar.telefone}</p>
          </>
        ) : null}

        {bar.horario ? (
          <>
            <h2>Horário</h2>
            <p>{bar.horario}</p>
          </>
        ) : null}
      </section>

      <footer className="details-actions">
        <button className={currentRating === "like" ? "active-like" : ""} onClick={() => rate("like")}>
          Like
        </button>
        <button className={currentRating === "dislike" ? "active-dislike" : ""} onClick={() => rate("dislike")}>
          Dislike
        </button>
        <a href={bar.mapsUrl} target="_blank" rel="noreferrer">
          Ver no Maps
        </a>
      </footer>

      {showImage ? <ImageModal imageUrl={bar.imagemUrl} title={bar.nome} onClose={() => setShowImage(false)} /> : null}
    </main>
  );
}
