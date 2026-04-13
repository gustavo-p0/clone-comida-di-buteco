"use client";

import Map, { Layer, MapRef, Marker, NavigationControl, Source, ViewState } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, Point } from "geojson";
import { AppIcon } from "@/components/app-icon";
import { GoogleMapsLinkIcon } from "@/components/google-maps-link-icon";
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
const BARS_SOURCE_ID = "bars-source";
const CLUSTERS_LAYER_ID = "bars-clusters";
const CLUSTER_COUNT_LAYER_ID = "bars-cluster-count";
const UNCLUSTERED_HIT_LAYER_ID = "bars-unclustered-hit";
const UNCLUSTERED_DOT_LAYER_ID = "bars-unclustered-dot";
const SELECTED_DOT_LAYER_ID = "bars-selected-dot";

const clusterLayer: maplibregl.CircleLayerSpecification = {
  id: CLUSTERS_LAYER_ID,
  type: "circle",
  source: BARS_SOURCE_ID,
  filter: ["has", "point_count"],
  paint: {
    "circle-color": ["step", ["get", "point_count"], "#f59e0b", 12, "#fb923c", 24, "#ea580c"],
    "circle-radius": ["step", ["get", "point_count"], 18, 12, 21, 24, 24],
    "circle-stroke-width": 2,
    "circle-stroke-color": "#111111"
  }
};

const clusterCountLayer: maplibregl.SymbolLayerSpecification = {
  id: CLUSTER_COUNT_LAYER_ID,
  type: "symbol",
  source: BARS_SOURCE_ID,
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-size": 11,
    "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"]
  },
  paint: {
    "text-color": "#1a0e00"
  }
};

const unclusteredHitLayer: maplibregl.CircleLayerSpecification = {
  id: UNCLUSTERED_HIT_LAYER_ID,
  type: "circle",
  source: BARS_SOURCE_ID,
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-radius": 18,
    "circle-opacity": 0
  }
};

const unclusteredDotLayer: maplibregl.CircleLayerSpecification = {
  id: UNCLUSTERED_DOT_LAYER_ID,
  type: "circle",
  source: BARS_SOURCE_ID,
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-radius": 7,
    "circle-color": "#ffba45",
    "circle-stroke-width": 2,
    "circle-stroke-color": "#111111"
  }
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
  const barsGeoJson = useMemo<FeatureCollection<Point>>(
    () => ({
      type: "FeatureCollection",
      features: mappableBars.map((bar) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [bar.longitude as number, bar.latitude as number]
        },
        properties: {
          barId: bar.id
        }
      }))
    }),
    [mappableBars]
  );
  const selectedDotLayer = useMemo<maplibregl.CircleLayerSpecification>(
    () => ({
      id: SELECTED_DOT_LAYER_ID,
      type: "circle",
      source: BARS_SOURCE_ID,
      filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "barId"], selectedBarId ?? "__none__"]],
      paint: {
        "circle-radius": 10,
        "circle-color": "#ffffff",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffba45"
      }
    }),
    [selectedBarId]
  );

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

  function resetView() {
    setSelectedBarId(null);
    mapRef.current?.flyTo({
      center: [BH_VIEW.longitude, BH_VIEW.latitude],
      zoom: BH_VIEW.zoom,
      essential: true
    });
  }

  function handleMapClick(event: maplibregl.MapLayerMouseEvent) {
    if (!event.features?.length || !mapRef.current) return;
    const feature = event.features[0];
    const map = mapRef.current.getMap();

    if (feature.layer.id === CLUSTERS_LAYER_ID) {
      const clusterId = feature.properties?.cluster_id;
      if (clusterId === undefined) return;

      const source = map.getSource(BARS_SOURCE_ID) as maplibregl.GeoJSONSource;
      void source.getClusterExpansionZoom(clusterId).then((zoom) => {
        const [lng, lat] = (feature.geometry as Point).coordinates;
        map.easeTo({
          center: [lng, lat],
          zoom,
          duration: 250
        });
      });
      return;
    }

    const barId = feature.properties?.barId;
    if (typeof barId === "string") {
      setSelectedBarId(barId);
    }
  }

  return (
    <section className="map-tab">
      <Map
        ref={mapRef}
        initialViewState={BH_VIEW}
        onLoad={() => setIsMapReady(true)}
        onClick={handleMapClick}
        interactiveLayerIds={[CLUSTERS_LAYER_ID, UNCLUSTERED_HIT_LAYER_ID]}
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
        <Source id={BARS_SOURCE_ID} type="geojson" data={barsGeoJson} cluster clusterMaxZoom={14} clusterRadius={42}>
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...unclusteredHitLayer} />
          <Layer {...unclusteredDotLayer} />
          <Layer {...selectedDotLayer} />
        </Source>
      </Map>

      <button className="map-reset-btn" onClick={resetView} aria-label="Visão geral de BH" title="Visão geral de BH">
        <AppIcon name="explore" size={18} />
      </button>

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
                  aria-label={`Ver ${selectedBar.nome} na lista`}
                  title="Ver na lista"
                >
                  <AppIcon name="list" size={17} />
                </button>
                <Link
                  href={`/bar/${selectedBar.slug}`}
                  className="map-bar-btn"
                  aria-label={`Ver detalhes de ${selectedBar.nome}`}
                  title="Ver detalhes"
                >
                  <AppIcon name="visibility" size={17} />
                </Link>
                <a
                  href={selectedBar.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="map-bar-btn map-bar-btn-maps"
                  aria-label={`Abrir ${selectedBar.nome} no Google Maps`}
                  title="Google Maps"
                >
                  <GoogleMapsLinkIcon size={18} className="google-maps-link-icon" />
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
