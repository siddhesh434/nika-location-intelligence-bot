"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export default function MarkerMap({ locations = [] }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [0, 20],
      zoom: 2,
    });

    //https://tiles.openfreemap.org/styles/liberty
    //https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
    map.current.addControl(new maplibregl.ScaleControl(), "bottom-left");
    map.current.addControl(new maplibregl.FullscreenControl(), "top-right");
  }, []);

  // Update markers when locations change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    if (locations.length > 0) {
      locations.forEach((location, idx) => {
        const el = document.createElement("div");
        el.className = "custom-marker";
        el.style.cssText = `
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 13px;
  position: relative;
`;

        el.textContent = (idx + 1).toString();

        const addressParts = [];
        if (location.address) {
          if (location.address.road) addressParts.push(location.address.road);
          if (location.address.suburb)
            addressParts.push(location.address.suburb);
          if (location.address.city) addressParts.push(location.address.city);
          if (location.address.country)
            addressParts.push(location.address.country);
        }

        const popup = new maplibregl.Popup({
          offset: 25,
          closeButton: false,
        }).setHTML(`
        <div class="p-3 max-w-[240px] bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-600/40 shadow-xl">
          <h3 class="font-semibold text-white text-sm mb-1">
            ${location.name || location.display_name}
          </h3>

          <p class="text-[11px] text-slate-400 capitalize">
            ${location.class ? location.class + " • " : ""}${location.type}
          </p>

          ${
            addressParts.length > 0
              ? `<p class="text-[10px] text-slate-500 mt-1">${addressParts.join(
                  ", "
                )}</p>`
              : ""
          }

          <p class="text-[10px] text-slate-500 mt-2 font-mono">
            📍 ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}
          </p>
        </div>
        `);

        const marker = new maplibregl.Marker({ element: el, draggable: false })
          .setLngLat([location.lng, location.lat])
          .setPopup(popup)
          .addTo(map.current);

        markers.current.push(marker);
      });

      // Fit map to show all locations
      const bounds = new maplibregl.LngLatBounds();
      locations.forEach((loc) => {
        bounds.extend([loc.lng, loc.lat]);
      });

      map.current.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        maxZoom: 15,
        duration: 1000,
      });
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
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <svg
                className="w-6 h-6 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-white">
                {locations.length} location{locations.length !== 1 ? "s" : ""}
              </div>
              <div className="text-xs text-slate-400">
                Click markers for details
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
