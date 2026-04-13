"use client";

import Map, { MapRef, Marker, NavigationControl, Popup, ViewState } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bar } from "@/types/bar";

type MapTabProps = {
  bars: Bar[];
  focusBarId?: string;
  userLocation?: { lat: number; lng: number } | null;
};

const BH_VIEW: ViewState = {
  latitude: -19.9191,
  longitude: -43.9386,
  zoom: 11.5,
  bearing: 0,
  pitch: 0,
  padding: { top: 0, right: 0, bottom: 0, left: 0 }
};

export function MapTab({ bars, focusBarId, userLocation }: MapTabProps) {
  const mappableBars = useMemo(
    () => bars.filter((bar) => typeof bar.latitude === "number" && typeof bar.longitude === "number"),
    [bars]
  );
  const mapRef = useRef<MapRef | null>(null);
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
    if (!userLocation || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 12.8,
      essential: true
    });
  }, [userLocation]);

  return (
    <section className="map-tab">
      <Map
        ref={mapRef}
        initialViewState={BH_VIEW}
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
          <MapPopup bars={mappableBars} selectedBarId={selectedBarId} onClose={() => setClickedBarId(null)} />
        ) : null}
      </Map>
    </section>
  );
}

function MapPopup({
  bars,
  selectedBarId,
  onClose
}: {
  bars: Bar[];
  selectedBarId: string;
  onClose: () => void;
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
      <a href={selectedBar.mapsUrl} target="_blank" rel="noreferrer">
        Abrir no Google Maps
      </a>
    </Popup>
  );
}
