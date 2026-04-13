"use client";

import Map, { Marker } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import { GoogleMapsLinkIcon } from "@/components/google-maps-link-icon";

type Props = {
  lat: number;
  lng: number;
  mapsUrl: string;
};

export default function DetailsMapPreview({ lat, lng, mapsUrl }: Props) {
  return (
    <div className="details-map-block">
      <div className="details-map-canvas" aria-hidden="true">
        <Map
          initialViewState={{ latitude: lat, longitude: lng, zoom: 14 }}
          style={{ width: "100%", height: "100%" }}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          mapLib={maplibregl}
        >
          <Marker latitude={lat} longitude={lng}>
            <div className="map-marker" />
          </Marker>
        </Map>
      </div>
      <div className="details-map-cta-row">
        <a href={mapsUrl} target="_blank" rel="noreferrer" className="details-map-ver-btn">
          <GoogleMapsLinkIcon size={20} className="google-maps-link-icon" />
          Ver no Google Maps
        </a>
      </div>
    </div>
  );
}
