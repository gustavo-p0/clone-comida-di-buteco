"use client";

import { useMemo, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { StoredRating } from "@/types/bar";

type RatingsFilter = "all" | "like" | "dislike";

type RatingsTabProps = {
  ratings: StoredRating[];
  onShowInMap: (barId: string) => void;
  onShowInList: (barId: string) => void;
  onShare: (barId: string) => void;
};

export function RatingsTab({ ratings, onShowInMap, onShowInList, onShare }: RatingsTabProps) {
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
            <li key={rating.barId} id={`rating-${rating.barId}`} className="rating-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="rating-image" src={rating.imageUrl} alt={rating.barName} loading="lazy" />
              <div className="rating-content">
                <div className="rating-header">
                  <strong>{rating.barName}</strong>
                  <span className={`badge-${rating.rating}`}>{rating.rating === "like" ? "Like" : "Dislike"}</span>
                </div>
                <p className="rating-dish">{rating.dishName}</p>
                <small className="rating-time">{new Date(rating.savedAt).toLocaleString("pt-BR")}</small>
                <div className="rating-actions">
                  <button
                    className="rating-action-btn rating-action-btn-map"
                    onClick={() => onShowInMap(rating.barId)}
                    aria-label={`Mostrar ${rating.barName} na carta interativa do app`}
                    title="Carta interativa"
                  >
                    <AppIcon name="map" size={17} />
                  </button>
                  <button
                    className="rating-action-btn rating-action-btn-list"
                    onClick={() => onShowInList(rating.barId)}
                    aria-label={`Ver ${rating.barName} na lista`}
                    title="Ver na lista"
                  >
                    <AppIcon name="list" size={17} />
                  </button>
                  <button
                    className="rating-action-btn rating-action-btn-share"
                    onClick={() => onShare(rating.barId)}
                    aria-label={`Compartilhar ${rating.barName}`}
                    title="Compartilhar"
                  >
                    <AppIcon name="share" size={17} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
