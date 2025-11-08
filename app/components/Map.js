// app/components/Map.js
"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export default function Map({ locations = [] }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const polygonLayerId = useRef("location-polygons");

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Initialize map only once

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [0, 20],
      zoom: 2,
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    // Add scale control
    map.current.addControl(new maplibregl.ScaleControl(), "bottom-left");

    // Add fullscreen control
    map.current.addControl(new maplibregl.FullscreenControl(), "top-right");
  }, []);

  // Update markers and polygons when locations change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    // Remove existing polygon layer and source
    if (map.current.getLayer(polygonLayerId.current)) {
      map.current.removeLayer(polygonLayerId.current);
      map.current.removeLayer(polygonLayerId.current + "-outline");
    }
    if (map.current.getSource(polygonLayerId.current)) {
      map.current.removeSource(polygonLayerId.current);
    }

    // Add new markers and polygons
    if (locations.length > 0) {
      // Create GeoJSON for polygons - prioritize GeoJSON, fallback to bounding boxes
      const polygonFeatures = locations
        .map((loc, idx) => {
          // If we have GeoJSON polygon data, use it
          if (loc.geojson) {
            return {
              type: "Feature",
              id: idx,
              geometry: loc.geojson,
              properties: {
                name: loc.name || loc.display_name,
                type: loc.type,
                class: loc.class,
              },
            };
          }
          // Otherwise, create a polygon from bounding box
          else if (loc.boundingbox && loc.boundingbox.length === 4) {
            const [minLat, maxLat, minLon, maxLon] =
              loc.boundingbox.map(parseFloat);
            return {
              type: "Feature",
              id: idx,
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [minLon, minLat],
                    [maxLon, minLat],
                    [maxLon, maxLat],
                    [minLon, maxLat],
                    [minLon, minLat],
                  ],
                ],
              },
              properties: {
                name: loc.name || loc.display_name,
                type: loc.type,
                class: loc.class,
                isBoundingBox: true,
              },
            };
          }
          return null;
        })
        .filter(Boolean);

      // Add polygon source and layers if we have polygon data
      if (polygonFeatures.length > 0) {
        map.current.addSource(polygonLayerId.current, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: polygonFeatures,
          },
        });

        // Add fill layer
        map.current.addLayer({
          id: polygonLayerId.current,
          type: "fill",
          source: polygonLayerId.current,
          paint: {
            "fill-color": "#3B82F6",
            "fill-opacity": [
              "case",
              ["get", "isBoundingBox"],
              0.1, // Lower opacity for bounding boxes
              0.25, // Higher opacity for actual polygons
            ],
          },
        });

        // Add outline layer
        map.current.addLayer({
          id: polygonLayerId.current + "-outline",
          type: "line",
          source: polygonLayerId.current,
          paint: {
            "line-color": "#2563EB",
            "line-width": [
              "case",
              ["get", "isBoundingBox"],
              1, // Thinner line for bounding boxes
              2, // Thicker line for actual polygons
            ],
            "line-dasharray": [
              "case",
              ["get", "isBoundingBox"],
              ["literal", [2, 2]], // Dashed line for bounding boxes
              ["literal", [1, 0]], // Solid line for actual polygons
            ],
          },
        });

        // Add click handler for polygons
        map.current.on("click", polygonLayerId.current, (e) => {
          const feature = e.features[0];
          const isBbox = feature.properties.isBoundingBox;
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(
              `
              <div style="padding: 8px;">
                <h3 style="font-weight: bold; margin-bottom: 4px;">${
                  feature.properties.name
                }</h3>
                <p style="font-size: 12px; color: #666; text-transform: capitalize;">
                  ${feature.properties.class || feature.properties.type}
                </p>
                ${
                  isBbox
                    ? '<p style="font-size: 10px; color: #999; margin-top: 4px;">📦 Bounding box area</p>'
                    : ""
                }
              </div>
            `
            )
            .addTo(map.current);
        });

        // Change cursor on hover
        map.current.on("mouseenter", polygonLayerId.current, () => {
          map.current.getCanvas().style.cursor = "pointer";
        });
        map.current.on("mouseleave", polygonLayerId.current, () => {
          map.current.getCanvas().style.cursor = "";
        });
      }

      // Add markers for all locations
      locations.forEach((location, idx) => {
        // Create custom marker element
        const el = document.createElement("div");
        el.className = "custom-marker";
        el.style.cssText = `
          background-color: #3B82F6;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
        `;
        el.textContent = (idx + 1).toString();

        el.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.2)";
        });

        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1)";
        });

        // Create detailed popup
        const addressParts = [];
        if (location.address) {
          if (location.address.road) addressParts.push(location.address.road);
          if (location.address.suburb)
            addressParts.push(location.address.suburb);
          if (location.address.city) addressParts.push(location.address.city);
          if (location.address.country)
            addressParts.push(location.address.country);
        }

        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
          `<div style="padding: 10px; max-width: 250px;">
            <h3 style="font-weight: bold; margin-bottom: 6px; font-size: 14px;">
              ${location.name || location.display_name}
            </h3>
            <p style="font-size: 11px; color: #666; text-transform: capitalize; margin-bottom: 4px;">
              ${location.class ? location.class + " • " : ""}${location.type}
            </p>
            ${
              addressParts.length > 0
                ? `<p style="font-size: 10px; color: #888; margin-top: 6px;">${addressParts.join(
                    ", "
                  )}</p>`
                : ""
            }
            <p style="font-size: 10px; color: #999; margin-top: 4px;">
              📍 ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}
            </p>
            ${
              location.svg
                ? '<p style="font-size: 9px; color: #0ea5e9; margin-top: 4px;">✨ Detailed boundary available</p>'
                : ""
            }
          </div>`
        );

        // Create and add marker
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([location.lng, location.lat])
          .setPopup(popup)
          .addTo(map.current);

        markers.current.push(marker);
      });

      // Fit map to show all locations
      const bounds = new maplibregl.LngLatBounds();
      locations.forEach((loc) => {
        // If we have a bounding box, extend bounds to include it
        if (loc.boundingbox && loc.boundingbox.length === 4) {
          const [minLat, maxLat, minLon, maxLon] =
            loc.boundingbox.map(parseFloat);
          bounds.extend([minLon, minLat]);
          bounds.extend([maxLon, maxLat]);
        } else {
          bounds.extend([loc.lng, loc.lat]);
        }
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
      >
        <div className="flex items-center justify-center h-full text-slate-400">
          <div className="text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <p className="text-sm font-medium">Map Preview</p>
          </div>
        </div>
      </div>

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

      {locations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-slate-900/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-md border border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Interactive Map</h3>
            </div>
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              Ask me to find places in the chat, and they'll appear here with
              interactive markers and boundaries
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs text-slate-400">
                <span className="text-emerald-400 mt-0.5">→</span>
                <span>Find cafes in Paris</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-400">
                <span className="text-emerald-400 mt-0.5">→</span>
                <span>Show me museums in Berlin</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-400">
                <span className="text-emerald-400 mt-0.5">→</span>
                <span>Where is the Eiffel Tower?</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
