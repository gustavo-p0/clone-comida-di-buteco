"use client";

import Map, { MapRef, Marker, NavigationControl, Popup, ViewState } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [clickedBarId, setClickedBarId] = useState<string | null>(null);
  const selectedBarId = focusBarId ?? clickedBarId;

  useEffect(() => {
    if (!selectedBarId || !mapRef.current) return;
    const selectedBar = mappableBars.find((bar) => bar.id === selectedBarId);
    if (!selectedBar || selectedBar.latitude === null || selectedBar.longitude === null) return;

    mapRef.current.flyTo({
      center: [selectedBar.longitude, selectedBar.latitude],
      zoom: 14.5,
      essential: true
    });
  }, [mappableBars, selectedBarId]);

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
              className="map-marker"
              onClick={() => setClickedBarId(bar.id)}
              aria-label={`Abrir ${bar.nome}`}
            />
          </Marker>
        ))}
        {selectedBarId ? (
          <MapPopup
            bars={mappableBars}
            selectedBarId={selectedBarId}
            onClose={() => setClickedBarId(null)}
            onShowInList={onShowInList}
          />
        ) : null}
      </Map>
    </section>
  );
}

function MapPopup({
  bars,
  selectedBarId,
  onClose,
  onShowInList
}: {
  bars: Bar[];
  selectedBarId: string;
  onClose: () => void;
  onShowInList: (barId: string) => void;
}) {
  const selectedBar = bars.find((bar) => bar.id === selectedBarId);
  if (!selectedBar || selectedBar.latitude === null || selectedBar.longitude === null) {
    return null;
  }

  return (
    <Popup
      anchor="bottom"
      latitude={selectedBar.latitude}
      longitude={selectedBar.longitude}
      onClose={onClose}
      closeButton
      closeOnClick={false}
      maxWidth="240px"
    >
      <strong>{selectedBar.nome}</strong>
      <p>{selectedBar.endereco}</p>
      <div className="map-popup-actions">
        <button type="button" onClick={() => onShowInList(selectedBar.id)}>
          Ver na lista
        </button>
        <a href={selectedBar.mapsUrl} target="_blank" rel="noreferrer">
          Abrir no Google Maps
        </a>
      </div>
    </Popup>
  );
}
