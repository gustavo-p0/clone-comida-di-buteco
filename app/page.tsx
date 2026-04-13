"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { GoogleMapsLinkIcon } from "@/components/google-maps-link-icon";
import { BarCard } from "@/components/bar-card";
import { ImageModal } from "@/components/image-modal";
import { MapTab } from "@/components/map-tab";
import { OfficialBrandTab, officialBrandImageSrc } from "@/components/official-brand-tab";
import { RatingsTab } from "@/components/ratings-tab";
import { consumeExploreRouteFilterPayload, consumeExplorerOpenTab } from "@/lib/explore-route-filter";
import { getBars } from "@/lib/bars";
import { distanceInKm } from "@/lib/distance";
import { readRatings, saveRatings } from "@/lib/rating-storage";
import {
  readLastSharedRoute,
  readRouteDraft,
  ROUTE_DRAFT_UPDATED_EVENT,
  saveLastSharedRoute,
  saveRouteDraft,
  type LastSharedRoute
} from "@/lib/route-draft-storage";
import { Bar, RatingValue, StoredRating } from "@/types/bar";

type TabId = "lista" | "mapa" | "roteiro" | "avaliacoes" | "oficial";
type RatingFilter = "all" | "like" | "dislike" | "unrated";
type RadiusOption = 1 | 3 | 5 | 10 | "all";
type SortOption = "name" | "distance";

const LOAD_STEP = 12;
const RADIUS_OPTIONS: RadiusOption[] = [1, 3, 5, 10, "all"];
const LOCATION_TOTAL_TIMEOUT_MS = 20000;

export default function HomePage() {
  const bars = useMemo(() => getBars(), []);
  const [activeTab, setActiveTab] = useState<TabId>("lista");
  const [ratings, setRatings] = useState<StoredRating[]>(() => readRatings());
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [radiusKm, setRadiusKm] = useState<RadiusOption>(5);
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [isFiltersVisible, setIsFiltersVisible] = useState(true);
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
  const [canRetryLocation, setCanRetryLocation] = useState(false);
  const [selectedImageBar, setSelectedImageBar] = useState<Bar | null>(null);
  const [mapFocusBarId, setMapFocusBarId] = useState<string | undefined>(undefined);
  const [routeTitle, setRouteTitle] = useState("");
  const [selectedRouteBarIds, setSelectedRouteBarIds] = useState<string[]>([]);
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [lastSharedRoute, setLastSharedRoute] = useState<LastSharedRoute | null>(null);
  const [lastShareLinkCopied, setLastShareLinkCopied] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const skipRouteDraftPersistRef = useRef(true);
  const copyToastTimeoutRef = useRef<number | null>(null);
  const [copyToastMessage, setCopyToastMessage] = useState<string | null>(null);
  const [routeShareConfigured, setRouteShareConfigured] = useState<boolean | null>(null);
  const [appliedSharedRouteFilter, setAppliedSharedRouteFilter] = useState<{
    barIds: string[];
    title: string | null;
  } | null>(null);

  const resetListFilters = useCallback(() => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setRatingFilter("all");
    setIsDistanceFilterActive(false);
    setLocationError(null);
    setCanRetryLocation(false);
  }, []);

  const showCopyToast = useCallback((message: string) => {
    if (copyToastTimeoutRef.current) {
      window.clearTimeout(copyToastTimeoutRef.current);
    }
    setCopyToastMessage(message);
    copyToastTimeoutRef.current = window.setTimeout(() => {
      setCopyToastMessage(null);
      copyToastTimeoutRef.current = null;
    }, 2800);
  }, []);

  const handleClearAllListFilters = useCallback(() => {
    resetListFilters();
    setRadiusKm(5);
    setSortBy("name");
    setVisibleCount(LOAD_STEP);
  }, [resetListFilters]);

  // Clean up ?q= after the state initializers consume it.
  useEffect(() => {
    if (window.location.search.includes("q=")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const draft = readRouteDraft();
    queueMicrotask(() => {
      setRouteTitle(draft.title);
      setSelectedRouteBarIds(draft.barIds);
      setLastSharedRoute(readLastSharedRoute());
      skipRouteDraftPersistRef.current = false;
    });
  }, []);

  useEffect(() => {
    const payload = consumeExploreRouteFilterPayload();
    const tab = consumeExplorerOpenTab();
    if (payload) {
      setAppliedSharedRouteFilter(payload);
      setVisibleCount(LOAD_STEP);
    }
    if (tab === "lista" || tab === "mapa") {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    function syncRouteDraftFromStorage() {
      if (skipRouteDraftPersistRef.current) {
        return;
      }
      const draft = readRouteDraft();
      setRouteTitle(draft.title);
      setSelectedRouteBarIds(draft.barIds);
    }

    window.addEventListener(ROUTE_DRAFT_UPDATED_EVENT, syncRouteDraftFromStorage);
    return () => window.removeEventListener(ROUTE_DRAFT_UPDATED_EVENT, syncRouteDraftFromStorage);
  }, []);

  useEffect(() => {
    if (skipRouteDraftPersistRef.current) {
      return;
    }
    saveRouteDraft({ barIds: selectedRouteBarIds, title: routeTitle });
  }, [selectedRouteBarIds, routeTitle]);

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
    const sharedSet =
      appliedSharedRouteFilter && appliedSharedRouteFilter.barIds.length > 0
        ? new Set(appliedSharedRouteFilter.barIds)
        : null;

    const rows = barsWithDistance.filter((row) => {
      if (sharedSet && !sharedSet.has(row.bar.id)) {
        return false;
      }

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

    const routeOrder =
      appliedSharedRouteFilter && appliedSharedRouteFilter.barIds.length > 0
        ? new Map(appliedSharedRouteFilter.barIds.map((id, index) => [id, index]))
        : null;

    if (routeOrder) {
      return [...rows].sort((a, b) => {
        const ia = routeOrder.get(a.bar.id) ?? 999;
        const ib = routeOrder.get(b.bar.id) ?? 999;
        if (ia !== ib) {
          return ia - ib;
        }
        if (sortBy === "distance" && userLocation) {
          if (a.distanceKm === null) return 1;
          if (b.distanceKm === null) return -1;
          return a.distanceKm - b.distanceKm;
        }
        return a.bar.nome.localeCompare(b.bar.nome, "pt-BR", { sensitivity: "base" });
      });
    }

    if (sortBy === "distance" && userLocation) {
      return rows.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    return rows.sort((a, b) => a.bar.nome.localeCompare(b.bar.nome, "pt-BR", { sensitivity: "base" }));
  }, [
    appliedSharedRouteFilter,
    barsWithDistance,
    debouncedSearchQuery,
    isDistanceFilterActive,
    radiusKm,
    ratingByBarId,
    ratingFilter,
    sortBy,
    userLocation
  ]);

  const visibleBars = useMemo(() => filteredBars.slice(0, visibleCount), [filteredBars, visibleCount]);
  const barsForMap = useMemo(() => filteredBars.map((item) => item.bar), [filteredBars]);
  const selectedRouteBars = useMemo(
    () =>
      selectedRouteBarIds
        .map((barId) => barsById[barId])
        .filter((bar): bar is Bar => Boolean(bar)),
    [barsById, selectedRouteBarIds]
  );
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
    labels.push(sortBy === "distance" ? "Ordenação: Distância" : "Ordenação: Nome");

    if (appliedSharedRouteFilter) {
      labels.push(
        appliedSharedRouteFilter.title
          ? `Roteiro partilhado: ${appliedSharedRouteFilter.title}`
          : "Roteiro partilhado (filtro)"
      );
    }

    return labels;
  }, [
    appliedSharedRouteFilter,
    debouncedSearchQuery,
    isDistanceFilterActive,
    radiusKm,
    ratingFilter,
    sortBy,
    userLocation
  ]);

  useEffect(() => {
    if (activeTab !== "lista" || !sentinelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }
        setVisibleCount((current) => {
          if (filteredBars.length === 0) {
            return current;
          }
          return current + LOAD_STEP;
        });
      },
      { rootMargin: "250px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [activeTab, filteredBars.length]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/routes")
      .then((res) => (res.ok ? res.json() : Promise.resolve({ shareEnabled: false })))
      .then((data: { shareEnabled?: boolean }) => {
        if (!cancelled) {
          setRouteShareConfigured(Boolean(data.shareEnabled));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRouteShareConfigured(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    setSelectedRouteBarIds((ids) => (ids.includes(bar.id) ? ids : [...ids, bar.id]));
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

  function isTimeoutError(error: GeolocationPositionError) {
    return error.code === error.TIMEOUT;
  }

  async function handleRequestLocation() {
    if (isDistanceFilterActive) {
      setIsDistanceFilterActive(false);
      setLocationError(null);
      setCanRetryLocation(false);
      setVisibleCount(LOAD_STEP);
      return;
    }

    if (userLocation) {
      setIsDistanceFilterActive(true);
      setLocationError(null);
      setCanRetryLocation(false);
      setVisibleCount(LOAD_STEP);
      return;
    }

    if (!("geolocation" in navigator)) {
      setLocationError("Seu navegador não suporta geolocalização.");
      setCanRetryLocation(false);
      return;
    }

    if (!window.isSecureContext) {
      setLocationError("Geolocalização exige HTTPS (ou localhost).");
      setCanRetryLocation(false);
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    setCanRetryLocation(false);

    try {
      const precisePosition = await requestCurrentPosition({
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      });

      setUserLocation({ lat: precisePosition.coords.latitude, lng: precisePosition.coords.longitude });
      setIsDistanceFilterActive(true);
      setVisibleCount(LOAD_STEP);
      setCanRetryLocation(false);
      setIsLocating(false);
      return;
    } catch (error) {
      const firstError = error as GeolocationPositionError;
      try {
        const fallbackPosition = await requestCurrentPosition({
          enableHighAccuracy: false,
          timeout: LOCATION_TOTAL_TIMEOUT_MS / 2,
          maximumAge: 300000
        });

        setUserLocation({ lat: fallbackPosition.coords.latitude, lng: fallbackPosition.coords.longitude });
        setIsDistanceFilterActive(true);
        setVisibleCount(LOAD_STEP);
        setCanRetryLocation(false);
        setIsLocating(false);
        return;
      } catch (fallbackError) {
        setIsDistanceFilterActive(false);
        setIsLocating(false);
        const lastError = fallbackError as GeolocationPositionError;
        const didTotalTimeout = isTimeoutError(firstError) && isTimeoutError(lastError);
        if (didTotalTimeout) {
          setLocationError("Não conseguimos sua localização no tempo limite total. Toque em Tentar novamente.");
          setCanRetryLocation(true);
          return;
        }

        setLocationError(getLocationErrorMessage(lastError));
        setCanRetryLocation(lastError.code !== lastError.PERMISSION_DENIED);
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
      setCanRetryLocation(false);
    }
  }

  function handleShowRatedBarInMap(barId: string) {
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
    // Strip /bar/... suffix to get the basePath (handles GitHub Pages subdirectory)
    const basePath = window.location.pathname.split("/bar/")[0].replace(/\/$/, "");
    const url = bar
      ? `${window.location.origin}${basePath}/bar/${bar.slug}?rec=1`
      : window.location.href;
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
      showCopyToast("Link copiado para a área de transferência.");
    } catch {
      window.prompt("Copie os detalhes e o link do card:", `${shareText}\n\n${url}`);
    }
  }

  function handleToggleRouteBar(barId: string) {
    setRouteError(null);
    setSelectedRouteBarIds((current) => {
      if (current.includes(barId)) {
        return current.filter((id) => id !== barId);
      }
      return [...current, barId];
    });
  }

  async function handleShareRoute() {
    const titleTrimmed = routeTitle.trim();
    if (!titleTrimmed || selectedRouteBarIds.length === 0) {
      if (!titleTrimmed && selectedRouteBarIds.length === 0) {
        setRouteError("Defina um título e adicione ao menos um bar antes de compartilhar.");
      } else if (!titleTrimmed) {
        setRouteError("Defina um título para o roteiro antes de compartilhar.");
      } else {
        setRouteError("Adicione ao menos um bar ao roteiro antes de compartilhar.");
      }
      return;
    }

    setIsCreatingRoute(true);
    setRouteError(null);

    const ratingsByBarId: Record<string, RatingValue> = {};
    for (const id of selectedRouteBarIds) {
      const entry = ratings.find((item) => item.barId === id);
      if (entry) {
        ratingsByBarId[id] = entry.rating;
      }
    }

    try {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          barIds: selectedRouteBarIds,
          title: titleTrimmed,
          ...(Object.keys(ratingsByBarId).length > 0 ? { ratingsByBarId } : {})
        })
      });

      const data = (await response.json()) as { shareUrl?: string; error?: string };
      if (!response.ok || !data.shareUrl) {
        setRouteError(data.error || "Não foi possível criar o roteiro.");
        setIsCreatingRoute(false);
        return;
      }

      saveLastSharedRoute(data.shareUrl, titleTrimmed);
      setLastSharedRoute(readLastSharedRoute());

      const shareText = `${titleTrimmed}\n${selectedRouteBarIds.length} bares selecionados`;

      try {
        if (navigator.share) {
          await navigator.share({
            title: titleTrimmed,
            text: shareText,
            url: data.shareUrl
          });
          setIsCreatingRoute(false);
          return;
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          setIsCreatingRoute(false);
          return;
        }
      }

      await navigator.clipboard.writeText(`${shareText}\n\n${data.shareUrl}`);
      showCopyToast("Link do roteiro copiado para a área de transferência.");
      setIsCreatingRoute(false);
    } catch {
      setRouteError("Erro de rede ao criar roteiro. Tente de novo.");
      setIsCreatingRoute(false);
    }
  }

  async function handleCopyLastSharedLink() {
    if (!lastSharedRoute) {
      return;
    }

    try {
      await navigator.clipboard.writeText(lastSharedRoute.shareUrl);
      setLastShareLinkCopied(true);
      window.setTimeout(() => setLastShareLinkCopied(false), 2000);
    } catch {
      window.prompt("Copie o link do roteiro:", lastSharedRoute.shareUrl);
    }
  }

  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    if (tab === "lista") {
      setVisibleCount(LOAD_STEP);
    }
    if (tab === "mapa") {
      setMapFocusBarId(undefined);
      setIsFiltersVisible(true);
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

  function handleSortChange(option: SortOption) {
    setSortBy(option);
    setVisibleCount(LOAD_STEP);
  }

  function handleClearSearch() {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setVisibleCount(LOAD_STEP);
  }

  const isMinimalHeaderTab = activeTab === "roteiro" || activeTab === "oficial";

  return (
    <main className={`app-root${activeTab === "mapa" ? " app-root-map" : ""}`}>
      <header className="top-header">
        <div className="header-title-row">
          <h1 className="app-title">Buteco Explorer</h1>
          {!isMinimalHeaderTab ? (
            <button
              type="button"
              className="toggle-filters-button"
              onClick={() => setIsFiltersVisible((current) => !current)}
              aria-label={isFiltersVisible ? "Ocultar filtros" : "Mostrar filtros"}
              title={isFiltersVisible ? "Ocultar filtros" : "Mostrar filtros"}
            >
              <AppIcon name={isFiltersVisible ? "close" : "tune"} size={20} />
            </button>
          ) : null}
        </div>

        {!isMinimalHeaderTab && isFiltersVisible && (
          <>
            <div className="header-controls-stack">
              <button onClick={handleRequestLocation} disabled={isLocating} className="location-cta">
                <AppIcon name="my-location" size={15} />
                <span>{isLocating ? "Localizando..." : isDistanceFilterActive ? "Limpar local" : "Usar localização"}</span>
              </button>
              <div className="filters-group">
                <p className="filters-group-label">Ordenar lista</p>
                <div className="sort-switch" role="group" aria-label="Ordenar lista">
                  <button
                    type="button"
                    className={`sort-switch-btn ${sortBy === "name" ? "sort-switch-btn-active" : ""}`}
                    onClick={() => handleSortChange("name")}
                  >
                    Nome
                  </button>
                  <button
                    type="button"
                    className={`sort-switch-btn ${sortBy === "distance" ? "sort-switch-btn-active" : ""}`}
                    disabled={!userLocation}
                    onClick={() => handleSortChange("distance")}
                  >
                    Mais perto
                  </button>
                </div>
                {!userLocation ? (
                  <p className="sort-hint">Ative localização para usar a ordenação Mais perto.</p>
                ) : null}
              </div>
            </div>

            <div className="filters-group">
              <p className="filters-group-label">Filtrar por raio</p>
              <div className="chip-row">
              {RADIUS_OPTIONS.map((option) => (
                <button
                  key={option}
                  className={`radius-chip ${radiusKm === option ? "chip-active" : ""}`}
                  onClick={() => handleRadiusChange(option)}
                >
                  {option === "all" ? "Sem limite" : `${option}km`}
                </button>
              ))}
              </div>
              {!userLocation ? (
                <p className="sort-hint">
                  Toque em <strong>Usar localização</strong> para filtrar por raio. O valor do chip será usado quando a
                  localização estiver ativa.
                </p>
              ) : null}
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
          </>
        )}

        {!isMinimalHeaderTab && locationError ? (
          <div className="filters-feedback filters-feedback-error" role="status" aria-live="polite">
            <p className="filters-feedback-text">{locationError}</p>
            {canRetryLocation ? (
              <button type="button" onClick={handleRequestLocation} disabled={isLocating} className="location-retry-button">
                {isLocating ? "Tentando..." : "Tentar novamente"}
              </button>
            ) : null}
          </div>
        ) : !isMinimalHeaderTab ? (
          <p className="filters-feedback">
            {isDistanceFilterActive && userLocation
              ? radiusKm === "all"
                ? `${filteredBars.length} bares sem limite de raio`
                : `${filteredBars.length} bares dentro de ${radiusKm}km de você`
              : `${filteredBars.length} bares encontrados`}
          </p>
        ) : null}
        {!isMinimalHeaderTab && activeFilterLabels.length > 0 && (
          <p className="filters-state filters-state-active">
            {`Filtros: ${activeFilterLabels.join(" • ")}`}
          </p>
        )}
        {activeTab === "lista" && filteredBars.length > 0 ? (
          <p className="list-count">
            Mostrando {visibleBars.length} de {filteredBars.length} bares
          </p>
        ) : null}

      </header>

      <section className="tab-content">
        {appliedSharedRouteFilter && (activeTab === "lista" || activeTab === "mapa") ? (
          <div className="explore-shared-route-banner" role="status">
            <p className="explore-shared-route-banner-text">
              {appliedSharedRouteFilter.title
                ? `A filtrar no Explorer: ${appliedSharedRouteFilter.title}`
                : "A filtrar no Explorer: roteiro partilhado"}
            </p>
            <button
              type="button"
              className="explore-shared-route-banner-clear"
              onClick={() => {
                setAppliedSharedRouteFilter(null);
                setVisibleCount(LOAD_STEP);
              }}
            >
              Limpar filtro
            </button>
          </div>
        ) : null}

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
              onToggleRoute={handleToggleRouteBar}
              isInRoute={selectedRouteBarIds.includes(bar.id)}
            />
          ))}

        {activeTab === "lista" && filteredBars.length === 0 ? (
          <div className="empty-box list-empty-filters">
            <p>Nenhum bar com os filtros atuais.</p>
            <p className="list-empty-hint">Ajuste a busca, as avaliações ou o raio, ou limpe tudo de uma vez.</p>
            <div className="list-empty-actions">
              <button type="button" className="list-empty-clear-btn" onClick={handleClearAllListFilters}>
                Limpar filtros
              </button>
              {appliedSharedRouteFilter ? (
                <button
                  type="button"
                  className="list-empty-clear-btn list-empty-clear-btn-secondary"
                  onClick={() => {
                    setAppliedSharedRouteFilter(null);
                    setVisibleCount(LOAD_STEP);
                  }}
                >
                  Limpar filtro do roteiro
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

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
            bars={barsForMap}
            focusBarId={mapFocusBarId}
            userLocation={userLocation}
            onShowInList={handleShowBarInList}
            distanceFilterActive={isDistanceFilterActive}
            radiusKm={radiusKm}
          />
        )}
        {activeTab === "avaliacoes" && (
          <RatingsTab
            ratings={ratings}
            onShowInMap={handleShowRatedBarInMap}
            onShowInList={handleShowBarInList}
            onShare={handleShareBar}
          />
        )}
        {activeTab === "oficial" && <OfficialBrandTab />}
        {activeTab === "roteiro" && (
          <section className="route-tab">
            <div className="route-tab-section-block">
              <h2 className="route-tab-section-title">Sobre o rascunho</h2>
              <p className="route-draft-note">
                Rascunho fica neste aparelho. Ícone <strong>Roteiro</strong> nos cards (lista/mapa) adiciona ou tira bares;
                likes/dislikes entram no link ao compartilhar.
              </p>
            </div>
            {lastSharedRoute ? (
              <div className="route-tab-section-block">
                <h2 className="route-tab-section-title">Último link gerado</h2>
                <div className="route-last-share">
                  <p className="route-last-share-immutable-note">
                    Rascunho não atualiza URLs antigos — após recompartilhar, mande o link novo.
                  </p>
                  <p className="route-last-share-meta">
                    {lastSharedRoute.title ? `${lastSharedRoute.title} · ` : ""}
                    {new Date(lastSharedRoute.savedAt).toLocaleString("pt-BR")}
                  </p>
                  <div className="route-last-share-row">
                    <input readOnly className="route-last-share-input" value={lastSharedRoute.shareUrl} aria-label="URL do roteiro" />
                    <button type="button" className="route-last-share-copy" onClick={handleCopyLastSharedLink}>
                      {lastShareLinkCopied ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="route-tab-section-block">
              <h2 className="route-tab-section-title">Gerar link</h2>
              <section className="route-builder">
                <input
                  type="text"
                  className="route-builder-input"
                  value={routeTitle}
                  onChange={(event) => setRouteTitle(event.target.value)}
                  placeholder="Título do roteiro"
                  maxLength={80}
                />
                <div className="route-builder-row">
                  <span>
                    {selectedRouteBarIds.length === 1
                      ? "1 bar no roteiro"
                      : `${selectedRouteBarIds.length} bares no roteiro`}
                  </span>
                  <button
                    type="button"
                    className="route-builder-share"
                    disabled={
                      isCreatingRoute ||
                      !routeTitle.trim() ||
                      selectedRouteBarIds.length === 0 ||
                      routeShareConfigured === false
                    }
                    onClick={handleShareRoute}
                  >
                    {isCreatingRoute ? "Gerando..." : "Compartilhar"}
                  </button>
                </div>
                <p className="route-builder-immutable-hint">
                  Cada envio é um <strong>link fixo</strong> (snapshot). Mudou o roteiro? Gere outro e passe o novo.
                </p>
                {routeShareConfigured === false ? (
                  <p className="route-builder-share-disabled-hint" role="status">
                    Links desativados: Redis (Upstash) não configurado no servidor.
                  </p>
                ) : null}
                {routeError ? <p className="route-builder-error">{routeError}</p> : null}
              </section>
            </div>

            <div className="route-tab-section-block">
              <h2 className="route-tab-section-title">Bares no roteiro</h2>
              {selectedRouteBars.length > 0 ? (
                <ul className="route-tab-list">
                  {selectedRouteBars.map((bar, index) => {
                    const routeItemRating = ratings.find((r) => r.barId === bar.id)?.rating;
                    return (
                      <li key={bar.id} className="route-tab-item">
                        <div className="route-tab-item-top">
                          <div className="route-tab-item-main">
                            <span className="route-tab-item-order">{`#${index + 1}`}</span>
                            <div>
                              <strong className="route-tab-item-name">{bar.nome}</strong>
                              <p className="route-tab-item-address">{bar.endereco}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="route-tab-item-remove"
                            onClick={() => handleToggleRouteBar(bar.id)}
                          >
                            Remover
                          </button>
                        </div>
                        <Link href={`/bar/${bar.slug}`} className="card-details-link route-tab-item-details">
                          Ver detalhes →
                        </Link>
                        <div className="card-actions route-tab-item-actions">
                          <div className="card-actions-left">
                            <button
                              type="button"
                              className={`card-icon-btn ${routeItemRating === "like" ? "active-like" : ""}`}
                              onClick={() => handleRate(bar, "like")}
                              aria-label={`Curtir ${bar.nome}`}
                              title="Curtir"
                            >
                              <AppIcon name="favorite" size={18} />
                            </button>
                            <button
                              type="button"
                              className={`card-icon-btn ${routeItemRating === "dislike" ? "active-dislike" : ""}`}
                              onClick={() => handleRate(bar, "dislike")}
                              aria-label={`Não curtir ${bar.nome}`}
                              title="Não curtir"
                            >
                              <AppIcon name="thumb-down" size={18} />
                            </button>
                            <button
                              type="button"
                              className="card-icon-btn"
                              onClick={() => void handleShareBar(bar.id)}
                              aria-label={`Compartilhar ${bar.nome}`}
                              title="Compartilhar"
                            >
                              <AppIcon name="share" size={18} />
                            </button>
                          </div>
                          <a
                            href={bar.mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="maps-cta card-maps-icon-btn"
                            aria-label={`Abrir ${bar.nome} no Google Maps`}
                            title="Google Maps"
                          >
                            <GoogleMapsLinkIcon size={22} className="google-maps-link-icon" />
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="empty-box route-empty-hint">
                  <p>Roteiro vazio.</p>
                  <p className="route-empty-hint-title">Adicionar bares</p>
                  <ul className="route-empty-hint-list">
                    <li>
                      <strong>Lista / mapa:</strong> ícone <strong>Roteiro</strong> no card (o da barra inferior).
                    </li>
                    <li>
                      <strong>Like/dislike</strong> no card ou na página do bar também entra no rascunho e no link.
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </section>
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
        <button className={activeTab === "roteiro" ? "tab-active" : ""} onClick={() => handleTabChange("roteiro")}>
          <AppIcon name="explore" size={18} />
          <span>Roteiro</span>
        </button>
        <button
          className={activeTab === "avaliacoes" ? "tab-active" : ""}
          onClick={() => handleTabChange("avaliacoes")}
        >
          <AppIcon name="star" size={18} />
          <span>Avaliações</span>
        </button>
        <button
          type="button"
          className={`bottom-nav-official-cta${activeTab === "oficial" ? " tab-active" : ""}`}
          onClick={() => handleTabChange("oficial")}
          aria-label="Site oficial Comida di Buteco e aviso legal"
        >
          <Image
            src={officialBrandImageSrc}
            alt=""
            width={26}
            height={26}
            className="bottom-nav-brand-icon"
            unoptimized
          />
          <span>Oficial</span>
        </button>
      </nav>

      {selectedImageBar ? (
        <ImageModal
          imageUrl={selectedImageBar.imagemUrl}
          title={selectedImageBar.nome}
          onClose={() => setSelectedImageBar(null)}
        />
      ) : null}

      {copyToastMessage ? (
        <div className="app-toast" role="status" aria-live="polite">
          {copyToastMessage}
        </div>
      ) : null}
    </main>
  );
}
