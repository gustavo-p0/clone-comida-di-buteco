"use client";

import { useMemo, useState } from "react";
import { StoredRating } from "@/types/bar";

type RatingsFilter = "all" | "like" | "dislike";

type RatingsTabProps = {
  ratings: StoredRating[];
  onShowInMap: (barId: string) => void;
};

export function RatingsTab({ ratings, onShowInMap }: RatingsTabProps) {
  const [filter, setFilter] = useState<RatingsFilter>("all");
  const filteredRatings = useMemo(
    () => ratings.filter((item) => (filter === "all" ? true : item.rating === filter)),
    [filter, ratings]
  );

  return (
    <section className="ratings-tab">
      <div className="chip-row">
        <button className={filter === "all" ? "chip-active" : ""} onClick={() => setFilter("all")}>
          Todos
        </button>
        <button className={filter === "like" ? "chip-active" : ""} onClick={() => setFilter("like")}>
          Likes
        </button>
        <button className={filter === "dislike" ? "chip-active" : ""} onClick={() => setFilter("dislike")}>
          Dislikes
        </button>
      </div>

      {filteredRatings.length === 0 ? (
        <div className="empty-box">
          <p>Você ainda não avaliou nenhum bar</p>
          <small>Seus dados de avaliação ficam salvos neste dispositivo</small>
        </div>
      ) : (
        <ul className="ratings-list">
          {filteredRatings.map((rating) => (
            <li key={rating.barId} className="rating-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rating.imageUrl} alt={rating.barName} loading="lazy" />
              <div className="rating-content">
                <strong>{rating.barName}</strong>
                <p>{rating.dishName}</p>
                <span className={`badge-${rating.rating}`}>
                  {rating.rating === "like" ? "Like" : "Dislike"}
                </span>
                <small>{new Date(rating.savedAt).toLocaleString("pt-BR")}</small>
              </div>
              <button onClick={() => onShowInMap(rating.barId)}>Ver no mapa</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
