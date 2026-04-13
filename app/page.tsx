"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarCard } from "@/components/bar-card";
import { ImageModal } from "@/components/image-modal";
import { MapTab } from "@/components/map-tab";
import { RatingsTab } from "@/components/ratings-tab";
import { getBars } from "@/lib/bars";
import { distanceInKm } from "@/lib/distance";
import { readRatings, saveRatings } from "@/lib/rating-storage";
import { Bar, RatingValue, StoredRating } from "@/types/bar";

type TabId = "lista" | "mapa" | "avaliacoes";

const LOAD_STEP = 12;
const RADIUS_OPTIONS = [1, 3, 5, 10] as const;

export default function HomePage() {
  const bars = useMemo(() => getBars(), []);
  const [activeTab, setActiveTab] = useState<TabId>("lista");
  const [ratings, setRatings] = useState<StoredRating[]>(() => readRatings());
  const [radiusKm, setRadiusKm] = useState<(typeof RADIUS_OPTIONS)[number]>(5);
  const [visibleCount, setVisibleCount] = useState(LOAD_STEP);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedImageBar, setSelectedImageBar] = useState<Bar | null>(null);
  const [mapFocusBarId, setMapFocusBarId] = useState<string | undefined>(undefined);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeTab !== "lista" || !sentinelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((current) => current + LOAD_STEP);
        }
      },
      { rootMargin: "250px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [activeTab]);

  const barsWithDistance = useMemo(() => {
    if (!userLocation) {
      return bars.map((bar) => ({ bar, distanceKm: null as number | null }));
    }

    return bars.map((bar) => {
      if (bar.latitude === null || bar.longitude === null) {
        return { bar, distanceKm: null };
      }

      return {
        bar,
        distanceKm: distanceInKm(userLocation.lat, userLocation.lng, bar.latitude, bar.longitude)
      };
    });
  }, [bars, userLocation]);

  const filteredBars = useMemo(() => {
    const rows = barsWithDistance.filter((row) =>
      userLocation ? row.distanceKm === null || row.distanceKm <= radiusKm : true
    );
    return rows.sort((a, b) => {
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }, [barsWithDistance, radiusKm, userLocation]);

  const visibleBars = useMemo(() => filteredBars.slice(0, visibleCount), [filteredBars, visibleCount]);

  function handleRate(bar: Bar, rating: RatingValue) {
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

  function handleRequestLocation() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition((position) => {
      setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
    });
  }

  function handleShowRatedBarInMap(barId: string) {
    setMapFocusBarId(barId);
    setActiveTab("mapa");
  }

  return (
    <main className="app-root">
      <header className="top-header">
        <button onClick={handleRequestLocation}>Perto de mim</button>
        <div className="chip-row">
          {RADIUS_OPTIONS.map((option) => (
            <button
              key={option}
              className={radiusKm === option ? "chip-active" : ""}
              onClick={() => setRadiusKm(option)}
            >
              {option}km
            </button>
          ))}
        </div>
      </header>

      <section className="tab-content">
        {activeTab === "lista" &&
          visibleBars.map(({ bar, distanceKm }) => (
            <BarCard
              key={bar.id}
              bar={bar}
              userLat={userLocation?.lat ?? null}
              userLng={userLocation?.lng ?? null}
              distanceKm={distanceKm}
              currentRating={ratings.find((item) => item.barId === bar.id)?.rating}
              onRate={handleRate}
              onOpenImage={setSelectedImageBar}
            />
          ))}

        {activeTab === "lista" && (
          <>
            <div ref={sentinelRef} />
            {visibleCount < filteredBars.length && <div className="skeleton">Carregando mais bares...</div>}
          </>
        )}

        {activeTab === "mapa" && <MapTab bars={bars} focusBarId={mapFocusBarId} />}
        {activeTab === "avaliacoes" && <RatingsTab ratings={ratings} onShowInMap={handleShowRatedBarInMap} />}
      </section>

      <nav className="bottom-nav">
        <button className={activeTab === "lista" ? "tab-active" : ""} onClick={() => setActiveTab("lista")}>
          Lista
        </button>
        <button className={activeTab === "mapa" ? "tab-active" : ""} onClick={() => setActiveTab("mapa")}>
          Mapa
        </button>
        <button
          className={activeTab === "avaliacoes" ? "tab-active" : ""}
          onClick={() => setActiveTab("avaliacoes")}
        >
          Avaliações
        </button>
      </nav>

      {selectedImageBar ? (
        <ImageModal
          imageUrl={selectedImageBar.imagemUrl}
          title={selectedImageBar.nome}
          onClose={() => setSelectedImageBar(null)}
        />
      ) : null}
    </main>
  );
}
