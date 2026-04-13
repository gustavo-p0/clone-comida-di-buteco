"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { BarCard } from "@/components/bar-card";
import { ImageModal } from "@/components/image-modal";
import { MapTab } from "@/components/map-tab";
import { RatingsTab } from "@/components/ratings-tab";
import { getBars } from "@/lib/bars";
import { distanceInKm } from "@/lib/distance";
import { readRatings, saveRatings } from "@/lib/rating-storage";
import { Bar, RatingValue, StoredRating } from "@/types/bar";

type TabId = "lista" | "mapa" | "avaliacoes";
type RatingFilter = "all" | "like" | "dislike" | "unrated";
type RadiusOption = 1 | 3 | 5 | 10 | "all";

const LOAD_STEP = 12;
const RADIUS_OPTIONS: RadiusOption[] = [1, 3, 5, 10, "all"];

export default function HomePage() {
  const bars = useMemo(() => getBars(), []);
  const [activeTab, setActiveTab] = useState<TabId>("lista");
  const [ratings, setRatings] = useState<StoredRating[]>(() => readRatings());
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [radiusKm, setRadiusKm] = useState<RadiusOption>(5);
  const [visibleCount, setVisibleCount] = useState(LOAD_STEP);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isDistanceFilterActive, setIsDistanceFilterActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("q") ?? "";
  });
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("q") ?? "";
  });
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedImageBar, setSelectedImageBar] = useState<Bar | null>(null);
  const [mapFocusBarId, setMapFocusBarId] = useState<string | undefined>(undefined);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const resetListFilters = useCallback(() => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setRatingFilter("all");
    setIsDistanceFilterActive(false);
    setLocationError(null);
  }, []);

  // Clean up ?q= from URL after it's been read into state
  useEffect(() => {
    if (window.location.search.includes("q=")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    }
  }, []);

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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

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

  const barsById = useMemo(() => {
    return bars.reduce<Record<string, Bar>>((accumulator, bar) => {
      accumulator[bar.id] = bar;
      return accumulator;
    }, {});
  }, [bars]);

  const ratingByBarId = useMemo(() => {
    return ratings.reduce<Record<string, RatingValue>>((accumulator, item) => {
      accumulator[item.barId] = item.rating;
      return accumulator;
    }, {});
  }, [ratings]);

  const filteredBars = useMemo(() => {
    const normalizedQuery = debouncedSearchQuery.trim().toLowerCase();
    const rows = barsWithDistance.filter((row) => {
      const isInsideRadius =
        isDistanceFilterActive && userLocation
          ? radiusKm === "all" || (row.distanceKm !== null && row.distanceKm <= radiusKm)
          : true;
      if (!isInsideRadius) return false;

      const currentRating = ratingByBarId[row.bar.id];
      if (ratingFilter === "unrated" && currentRating) return false;
      if (ratingFilter === "like" && currentRating !== "like") return false;
      if (ratingFilter === "dislike" && currentRating !== "dislike") return false;

      if (!normalizedQuery) return true;

      const haystack = `${row.bar.nome} ${row.bar.petiscoDescricao} ${row.bar.endereco}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    return rows.sort((a, b) => {
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }, [barsWithDistance, debouncedSearchQuery, isDistanceFilterActive, radiusKm, ratingByBarId, ratingFilter, userLocation]);

  const visibleBars = useMemo(() => filteredBars.slice(0, visibleCount), [filteredBars, visibleCount]);
  const barsForMap = useMemo(() => filteredBars.map((item) => item.bar), [filteredBars]);
  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];

    const normalizedSearch = debouncedSearchQuery.trim();
    if (normalizedSearch) {
      labels.push(`Busca: "${normalizedSearch}"`);
    }

    if (isDistanceFilterActive && userLocation) {
      labels.push(radiusKm === "all" ? "Raio: sem limite" : `Raio: ${radiusKm}km`);
    }

    if (ratingFilter === "like") labels.push("Avaliação: Likes");
    if (ratingFilter === "dislike") labels.push("Avaliação: Dislikes");
    if (ratingFilter === "unrated") labels.push("Avaliação: Não avaliados");

    return labels;
  }, [debouncedSearchQuery, isDistanceFilterActive, radiusKm, ratingFilter, userLocation]);

  function handleRate(bar: Bar, rating: RatingValue) {
    const currentRating = ratings.find((item) => item.barId === bar.id)?.rating;
    if (currentRating === rating) {
      const cleared = ratings.filter((item) => item.barId !== bar.id);
      setRatings(cleared);
      saveRatings(cleared);
      return;
    }

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

  function requestCurrentPosition(options: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  function getLocationErrorMessage(error: GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) {
      return "Permissão negada. No iPhone: Ajustes > Safari > Localização > Permitir.";
    }
    if (error.code === error.POSITION_UNAVAILABLE) {
      return "Localização indisponível no momento. Tente novamente em área aberta.";
    }
    if (error.code === error.TIMEOUT) {
      return "Localização demorou para responder. Tente novamente.";
    }
    return "Não foi possível obter sua localização.";
  }

  async function handleRequestLocation() {
    if (isDistanceFilterActive) {
      setIsDistanceFilterActive(false);
      setLocationError(null);
      setVisibleCount(LOAD_STEP);
      return;
    }

    if (userLocation) {
      setIsDistanceFilterActive(true);
      setLocationError(null);
      setVisibleCount(LOAD_STEP);
      return;
    }

    if (!("geolocation" in navigator)) {
      setLocationError("Seu navegador não suporta geolocalização.");
      return;
    }

    if (!window.isSecureContext) {
      setLocationError("Geolocalização exige HTTPS (ou localhost).");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    try {
      const precisePosition = await requestCurrentPosition({
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      });

      setUserLocation({ lat: precisePosition.coords.latitude, lng: precisePosition.coords.longitude });
      setIsDistanceFilterActive(true);
      setVisibleCount(LOAD_STEP);
      setIsLocating(false);
      return;
    } catch (error) {
      try {
        const fallbackPosition = await requestCurrentPosition({
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 300000
        });

        setUserLocation({ lat: fallbackPosition.coords.latitude, lng: fallbackPosition.coords.longitude });
        setIsDistanceFilterActive(true);
        setVisibleCount(LOAD_STEP);
        setIsLocating(false);
        return;
      } catch (fallbackError) {
        setIsDistanceFilterActive(false);
        setIsLocating(false);
        setLocationError(getLocationErrorMessage(fallbackError as GeolocationPositionError));
        return;
      }
    }
  }

  function handleRadiusChange(option: RadiusOption) {
    setRadiusKm(option);
    setVisibleCount(LOAD_STEP);
    if (userLocation) {
      setIsDistanceFilterActive(true);
      setLocationError(null);
      return;
    }

    if (!isLocating) {
      handleRequestLocation();
    }
  }

  function handleShowRatedBarInMap(barId: string) {
    resetListFilters();
    setMapFocusBarId(barId);
    setActiveTab("mapa");
  }

  function handleShowBarInList(barId: string) {
    const bar = barsById[barId];
    setActiveTab("lista");
    setMapFocusBarId(undefined);
    if (bar) {
      setSearchQuery(bar.nome);
      setDebouncedSearchQuery(bar.nome);
      setRatingFilter("all");
      setIsDistanceFilterActive(false);
      setVisibleCount(LOAD_STEP);
    }
  }

  async function handleShareBar(barId: string) {
    const bar = barsById[barId];
    const q = bar ? encodeURIComponent(bar.nome) : "";
    const url = `${window.location.origin}${window.location.pathname}${q ? `?q=${q}` : ""}`;
    const details = bar
      ? `${bar.nome}\n${bar.petiscoDescricao}\n${bar.endereco}`
      : "Bar do Comida di Buteco BH";
    const shareText = `Olha esse bar no Comida di Buteco BH:\n\n${details}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: bar ? `${bar.nome} • Comida di Buteco BH` : "Comida di Buteco BH",
          text: shareText,
          url
        });
        return;
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${url}`);
      window.alert("Link copiado para a área de transferência.");
    } catch {
      window.prompt("Copie os detalhes e o link do card:", `${shareText}\n\n${url}`);
    }
  }

  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    if (tab === "lista") {
      setVisibleCount(LOAD_STEP);
    }
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setVisibleCount(LOAD_STEP);
  }

  function handleRatingFilterChange(filter: RatingFilter) {
    setRatingFilter(filter);
    setVisibleCount(LOAD_STEP);
  }

  function handleClearSearch() {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setVisibleCount(LOAD_STEP);
  }

  return (
    <main className="app-root">
      <header className="top-header">
        <div className="header-title-row">
          <h1 className="app-title">Buteco Explorer</h1>
        </div>

        <div className="header-controls-row">
          <button onClick={handleRequestLocation} disabled={isLocating} className="location-cta">
            <AppIcon name="my-location" size={15} />
            <span>{isLocating ? "Localizando..." : isDistanceFilterActive ? "Limpar local" : "Usar localização"}</span>
          </button>
          <div className="sort-label">
            <span className="sort-label-top">SORT BY</span>
            <span className="sort-label-value">
              Distância <AppIcon name="chevron-down" size={13} />
            </span>
          </div>
        </div>

        <div className="chip-row">
          {RADIUS_OPTIONS.map((option) => (
            <button
              key={option}
              className={`radius-chip ${radiusKm === option ? "chip-active" : ""}`}
              onClick={() => handleRadiusChange(option)}
            >
              {option === "all" ? "∞" : `${option}km`}
            </button>
          ))}
        </div>

        <div className="search-field">
          <input
            type="search"
            className="search-input"
            placeholder="Buscar bar, prato ou endereço"
            value={searchQuery}
            onChange={(event) => handleSearchChange(event.target.value)}
            aria-label="Buscar bares"
          />
          {searchQuery ? (
            <button type="button" className="search-clear-button" onClick={handleClearSearch} aria-label="Limpar busca">
              ×
            </button>
          ) : null}
        </div>

        <div className="chip-row chip-row-sm">
          <button className={ratingFilter === "all" ? "chip-active" : ""} onClick={() => handleRatingFilterChange("all")}>
            Todos
          </button>
          <button className={ratingFilter === "like" ? "chip-active" : ""} onClick={() => handleRatingFilterChange("like")}>
            ❤ Likes
          </button>
          <button
            className={ratingFilter === "dislike" ? "chip-active" : ""}
            onClick={() => handleRatingFilterChange("dislike")}
          >
            👎 Dislikes
          </button>
          <button
            className={ratingFilter === "unrated" ? "chip-active" : ""}
            onClick={() => handleRatingFilterChange("unrated")}
          >
            Não avaliados
          </button>
        </div>

        <p className={`filters-feedback ${locationError ? "filters-feedback-error" : ""}`}>
          {locationError
            ? locationError
            : isDistanceFilterActive && userLocation
              ? radiusKm === "all"
                ? `${filteredBars.length} bares sem limite de raio`
                : `${filteredBars.length} bares dentro de ${radiusKm}km de você`
              : `${filteredBars.length} bares encontrados`}
        </p>
        {activeFilterLabels.length > 0 && (
          <p className="filters-state filters-state-active">
            {`Filtros: ${activeFilterLabels.join(" • ")}`}
          </p>
        )}
      </header>

      <section className="tab-content">
        {activeTab === "lista" && (
          <p className="list-count">
            Mostrando {visibleBars.length} de {filteredBars.length} bares
          </p>
        )}

        {activeTab === "lista" &&
          visibleBars.map(({ bar, distanceKm }) => (
            <BarCard
              key={bar.id}
              bar={bar}
              userLat={userLocation?.lat ?? null}
              userLng={userLocation?.lng ?? null}
              distanceKm={distanceKm}
              currentRating={ratingByBarId[bar.id]}
              onRate={handleRate}
              onOpenImage={setSelectedImageBar}
              onShare={handleShareBar}
            />
          ))}

        {activeTab === "lista" && (
          <>
            <div ref={sentinelRef} />
            {visibleCount < filteredBars.length && (
              <>
                <div className="skeleton-card" aria-hidden="true">
                  <div className="skeleton-image" />
                  <div className="skeleton-body">
                    <div className="skeleton-line" style={{ width: "65%" }} />
                    <div className="skeleton-line" style={{ width: "85%" }} />
                    <div className="skeleton-line" style={{ width: "40%" }} />
                  </div>
                </div>
                <div className="skeleton-card" aria-hidden="true">
                  <div className="skeleton-image" />
                  <div className="skeleton-body">
                    <div className="skeleton-line" style={{ width: "55%" }} />
                    <div className="skeleton-line" style={{ width: "75%" }} />
                    <div className="skeleton-line" style={{ width: "35%" }} />
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "mapa" && (
          <MapTab
            bars={isDistanceFilterActive && userLocation ? barsForMap : bars}
            focusBarId={mapFocusBarId}
            userLocation={userLocation}
            onShowInList={handleShowBarInList}
            distanceFilterActive={isDistanceFilterActive}
            radiusKm={radiusKm}
          />
        )}
        {activeTab === "avaliacoes" && (
          <RatingsTab ratings={ratings} onShowInMap={handleShowRatedBarInMap} onShare={handleShareBar} />
        )}
      </section>

      <nav className="bottom-nav">
        <button className={activeTab === "lista" ? "tab-active" : ""} onClick={() => handleTabChange("lista")}>
          <AppIcon name="list" size={18} />
          <span>Lista</span>
        </button>
        <button className={activeTab === "mapa" ? "tab-active" : ""} onClick={() => handleTabChange("mapa")}>
          <AppIcon name="map" size={18} />
          <span>Mapa</span>
        </button>
        <button
          className={activeTab === "avaliacoes" ? "tab-active" : ""}
          onClick={() => handleTabChange("avaliacoes")}
        >
          <AppIcon name="star" size={18} />
          <span>Avaliações</span>
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
