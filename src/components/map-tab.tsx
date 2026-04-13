"use client";

import Map, { Marker, NavigationControl, Popup, ViewState } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import { useMemo, useState } from "react";
import { Bar } from "@/types/bar";

type MapTabProps = {
  bars: Bar[];
  focusBarId?: string;
};

const BH_VIEW: ViewState = {
  latitude: -19.9191,
  longitude: -43.9386,
  zoom: 11.5,
  bearing: 0,
  pitch: 0,
  padding: { top: 0, right: 0, bottom: 0, left: 0 }
};

export function MapTab({ bars, focusBarId }: MapTabProps) {
  const mappableBars = useMemo(
    () => bars.filter((bar) => typeof bar.latitude === "number" && typeof bar.longitude === "number"),
    [bars]
  );
  const [selectedBarId, setSelectedBarId] = useState<string | null>(focusBarId ?? null);

  return (
    <section className="map-tab">
      <Map
        initialViewState={BH_VIEW}
        style={{ width: "100%", height: "100%" }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        mapLib={maplibregl}
      >
        <NavigationControl position="top-right" />
        {mappableBars.map((bar) => (
          <Marker key={bar.id} latitude={bar.latitude as number} longitude={bar.longitude as number}>
            <button
              className="map-marker"
              onClick={() => setSelectedBarId(bar.id)}
              aria-label={`Abrir ${bar.nome}`}
            />
          </Marker>
        ))}
        {selectedBarId ? (
          <MapPopup bars={mappableBars} selectedBarId={selectedBarId} onClose={() => setSelectedBarId(null)} />
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
    </Popup>
  );
}
