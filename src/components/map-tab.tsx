"use client";

import Map, { MapRef, Marker, NavigationControl, ViewState } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { Bar } from "@/types/bar";

type MapTabProps = {
  bars: Bar[];
  focusBarId?: string;
  userLocation?: { lat: number; lng: number } | null;
  onShowInList: (barId: string) => void;
  distanceFilterActive: boolean;
  radiusKm: 1 | 3 | 5 | 10 | "all";
};

const BH_VIEW: ViewState = {
  latitude: -19.9191,
  longitude: -43.9386,
  zoom: 11.5,
  bearing: 0,
  pitch: 0,
  padding: { top: 0, right: 0, bottom: 0, left: 0 }
};

function getZoomByRadius(radiusKm: 1 | 3 | 5 | 10 | "all") {
  if (radiusKm === 1) return 14.8;
  if (radiusKm === 3) return 13.9;
  if (radiusKm === 5) return 13.3;
  if (radiusKm === 10) return 12.5;
  return 11.5;
}

export function MapTab({
  bars,
  focusBarId,
  userLocation,
  onShowInList,
  distanceFilterActive,
  radiusKm
}: MapTabProps) {
  const mappableBars = useMemo(
    () => bars.filter((bar) => typeof bar.latitude === "number" && typeof bar.longitude === "number"),
    [bars]
  );
  const mapRef = useRef<MapRef | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  // MapTab unmounts on tab switch, so lazy initializer picks up focusBarId on each mount
  const [selectedBarId, setSelectedBarId] = useState<string | null>(() => focusBarId ?? null);
  const selectedBar = selectedBarId ? (mappableBars.find((b) => b.id === selectedBarId) ?? null) : null;

  // Fly to selected bar
  useEffect(() => {
    if (!selectedBarId || !mapRef.current) return;
    const bar = mappableBars.find((b) => b.id === selectedBarId);
    if (!bar || bar.latitude === null || bar.longitude === null) return;
    mapRef.current.flyTo({ center: [bar.longitude as number, bar.latitude as number], zoom: 14.5, essential: true });
  }, [mappableBars, selectedBarId]);

  // Fly to user location when available
  useEffect(() => {
    if (!isMapReady || !userLocation || !mapRef.current || selectedBarId) return;
    mapRef.current.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: distanceFilterActive ? getZoomByRadius(radiusKm) : 14,
      essential: true
    });
  }, [distanceFilterActive, isMapReady, radiusKm, selectedBarId, userLocation]);

  return (
    <section className="map-tab">
      <Map
        ref={mapRef}
        initialViewState={BH_VIEW}
        onLoad={() => setIsMapReady(true)}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        mapLib={maplibregl}
      >
        <NavigationControl position="top-right" />
        {userLocation ? (
          <Marker latitude={userLocation.lat} longitude={userLocation.lng}>
            <div className="map-marker-user" aria-label="Sua localização" />
          </Marker>
        ) : null}
        {mappableBars.map((bar) => (
          <Marker key={bar.id} latitude={bar.latitude as number} longitude={bar.longitude as number}>
            <button
              className={`map-marker ${selectedBarId === bar.id ? "map-marker-active" : ""}`}
              onClick={() => setSelectedBarId(bar.id)}
              aria-label={`Abrir ${bar.nome}`}
            />
          </Marker>
        ))}
      </Map>

      {selectedBar ? (
        <div className="map-bar-card">
          <button
            className="map-bar-card-close"
            onClick={() => setSelectedBarId(null)}
            aria-label="Fechar"
          >
            ×
          </button>
          <div className="map-bar-card-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedBar.imagemUrl} alt={selectedBar.nome} className="map-bar-card-img" />
            <div className="map-bar-card-body">
              <strong className="map-bar-card-name">{selectedBar.nome}</strong>
              <p className="map-bar-card-dish">{selectedBar.petiscoDescricao}</p>
              <div className="map-bar-card-actions">
                <button
                  type="button"
                  onClick={() => onShowInList(selectedBar.id)}
                  className="map-bar-btn"
                >
                  <AppIcon name="list" size={13} />
                  Ver na lista
                </button>
                <Link href={`/bar/${selectedBar.slug}`} className="map-bar-btn">
                  Ver detalhes
                </Link>
                <a
                  href={selectedBar.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="map-bar-btn map-bar-btn-maps"
                >
                  <AppIcon name="map" size={13} />
                  Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
