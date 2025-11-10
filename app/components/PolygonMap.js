"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export default function PolygonMap({ locations = [] }) {
  const mapContainer = useRef(null);
  const map = useRef(null);

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [0, 20],
      zoom: 2,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
    map.current.addControl(new maplibregl.ScaleControl(), "bottom-left");
    map.current.addControl(new maplibregl.FullscreenControl(), "top-right");
  }, []);

  // Update polygon when locations change
  useEffect(() => {
    if (!map.current) return;

    const updatePolygon = () => {
      const exists = map.current.getSource("location-polygon");

      if (locations.length > 0 && locations[0].polygon) {
        const location = locations[0];

        if (!exists) {
          // Create source once
          map.current.addSource("location-polygon", {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: location.polygon,
            },
          });

          map.current.addLayer({
            id: "location-fill",
            type: "fill",
            source: "location-polygon",
            paint: {
              "fill-color": "#088",
              "fill-opacity": 0.6,
            },
          });

          map.current.addLayer({
            id: "location-outline",
            type: "line",
            source: "location-polygon",
            paint: {
              "line-color": "#0066cc",
              "line-width": 2,
            },
          });
        } else {
          // If source exists, update data only
          exists.setData({
            type: "Feature",
            geometry: location.polygon,
          });
        }

        // Update marker + fit bounds
        new maplibregl.Marker({ color: "#FF0000" })
          .setLngLat([location.lng, location.lat])
          .setPopup(
            new maplibregl.Popup().setHTML(
              `<h3>${location.name}</h3><p>${location.type}</p>`
            )
          )
          .addTo(map.current);

        if (location.boundingBox?.length === 4) {
          const bounds = [
            [
              parseFloat(location.boundingBox[2]),
              parseFloat(location.boundingBox[0]),
            ],
            [
              parseFloat(location.boundingBox[3]),
              parseFloat(location.boundingBox[1]),
            ],
          ];
          map.current.fitBounds(bounds, { padding: 50 });
        }
      }
    };

    if (map.current.isStyleLoaded()) {
      updatePolygon();
    } else {
      map.current.once("load", updatePolygon);
    }
  }, [locations]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainer}
        className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900"
      />

      {locations.length > 0 && (
        <div className="absolute top-6 left-6 bg-slate-900/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 z-10 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
              <svg
                className="w-6 h-6 text-cyan-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-white">
                {locations[0].name}
              </div>
              <div className="text-xs text-slate-400">Polygon boundary</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
