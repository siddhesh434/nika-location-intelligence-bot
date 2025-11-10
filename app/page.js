// app/page.js
"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import MarkerMap from "./components/MakerMap";
import PolygonMap from "./components/PolygonMap";
import { latest } from "maplibre-gl";

export default function Chat() {
  const [locations, setLocations] = useState([]);
  const messagesEndRef = useRef(null);
  const [input, setInput] = useState("");
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [viewMode, setViewMode] = useState({});

  const { messages, sendMessage, isLoading } = useChat();

  useEffect(() => {
    // Find the last message with locations
    const messagesWithLocations = messages.filter((message) =>
      message.parts?.some(
        (part) => part.type === "tool-searchLocation" && part.output?.locations
      )
    );

    if (messagesWithLocations.length > 0) {
      const latestMessage =
        messagesWithLocations[messagesWithLocations.length - 1];
      const latestLocations =
        latestMessage.parts
          ?.filter(
            (part) =>
              part.type === "tool-searchLocation" && part.output?.locations
          )
          .flatMap((part) => part.output.locations || []) || [];

      if (latestLocations.length > 0) {
        const newLocationsStr = JSON.stringify(latestLocations);
        const currentLocationsStr = JSON.stringify(locations);

        if (newLocationsStr !== currentLocationsStr) {
          setLocations(latestLocations);
          setActiveMessageId(latestMessage.id);
        }
      }
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  const handleShowLocations = (messageId, messageLocations) => {
    setLocations(messageLocations);
    setActiveMessageId(messageId);
    // Initialize view mode for this message if not set
    if (!viewMode[messageId]) {
      setViewMode((prev) => ({ ...prev, [messageId]: "marker" }));
    }
  };

  const handleToggleView = (messageId, currentMode) => {
    setViewMode((prev) => ({
      ...prev,
      [messageId]: currentMode === "marker" ? "polygon" : "marker",
    }));
  };

  // Helper function to check if location has actual polygon geometry
  const hasPolygonGeometry = (location) => {
    const geoData = location.polygon;
    return geoData && geoData.type === "Polygon";
  };

  return (
    <div className="flex h-screen bg-slate-950 font-sans">
      {/* Chat Panel */}
      <div className="w-1/3 flex flex-col bg-slate-900 border-r border-slate-800">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 shadow-xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
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
              <h1 className="text-xl font-bold text-white">
                Nika Location Intelligence
              </h1>
            </div>
            <p className="text-sm text-emerald-50/80 ml-13">
              Powered by OpenStreetMap & AI
            </p>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center mt-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl mb-4">
                <svg
                  className="w-8 h-8 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-lg font-semibold text-slate-200 mb-2">
                Welcome!
              </p>
              <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto">
                I can help you discover places around the world or just have a
                conversation
              </p>

              <div className="text-left space-y-3 max-w-sm mx-auto">
                {/* Map Queries - WITH trigger words */}
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-sm p-4 rounded-2xl border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-emerald-400"
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
                    <p className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                      Map Queries (use trigger words)
                    </p>
                  </div>
                  <div className="text-xs text-slate-300 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5 font-bold">
                        •
                      </span>
                      <span>
                        <span className="text-emerald-400 font-semibold">
                          Find
                        </span>{" "}
                        Singapore on map
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5 font-bold">
                        •
                      </span>
                      <span>
                        <span className="text-emerald-400 font-semibold">
                          Search
                        </span>{" "}
                        for restaurants in Tokyo
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5 font-bold">
                        •
                      </span>
                      <span>
                        <span className="text-emerald-400 font-semibold">
                          Locate
                        </span>{" "}
                        the Eiffel Tower
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5 font-bold">
                        •
                      </span>
                      <span>
                        <span className="text-emerald-400 font-semibold">
                          Show
                        </span>{" "}
                        me Berlin on map
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5 font-bold">
                        •
                      </span>
                      <span>
                        <span className="text-emerald-400 font-semibold">
                          Display
                        </span>{" "}
                        Sentosa Island on the map
                      </span>
                    </div>
                  </div>
                </div>

                {/* General Chat - WITHOUT trigger words */}
                <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm p-4 rounded-2xl border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-cyan-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    </div>
                    <p className="text-xs font-bold text-cyan-300 uppercase tracking-wide">
                      General Chat (no map)
                    </p>
                  </div>
                  <div className="text-xs text-slate-300 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>Suggest tourist places in Indonesia</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>Where is Berlin?</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>What are good restaurants in Paris?</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>Tell me about museums in London</span>
                    </div>
                  </div>
                </div>

                {/* Info box explaining the difference */}
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-sm p-3 rounded-xl border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-xs text-amber-200/90">
                      <span className="font-semibold text-amber-300">
                        Pro tip:
                      </span>{" "}
                      Use action words like{" "}
                      <span className="text-amber-300 font-medium">find</span>,{" "}
                      <span className="text-amber-300 font-medium">search</span>
                      ,{" "}
                      <span className="text-amber-300 font-medium">locate</span>
                      , or{" "}
                      <span className="text-amber-300 font-medium">show</span>{" "}
                      to see results on the map!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20"
                    : "bg-slate-800 text-slate-100 shadow-lg border border-slate-700/50"
                }`}
              >
                {message.parts?.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className="text-sm leading-relaxed whitespace-pre-wrap"
                        >
                          {part.text}
                        </div>
                      );
                    case "tool-searchLocation":
                      const messageLocations = part.output?.locations || [];
                      const isActive = activeMessageId === message.id;
                      const currentViewMode = viewMode[message.id] || "marker";

                      // Check if it's a single location with polygon geometry
                      const isSingleLocation = messageLocations.length === 1;
                      const hasPolygon =
                        isSingleLocation &&
                        hasPolygonGeometry(messageLocations[0]);

                      console.log(
                        `Message ${message.id} - hasPolygon: ${hasPolygon}`
                      );

                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className="mt-3 pt-3 border-t border-slate-700/50"
                        >
                          <div className="text-xs">
                            {part.output?.error ? (
                              <div className="flex items-center gap-2 text-red-400">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span>Search error: {part.output.error}</span>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-slate-400">
                                  <svg
                                    className="w-4 h-4 text-emerald-400"
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
                                  </svg>
                                  <span>
                                    Found {part.output?.count || 0} location
                                    {part.output?.count !== 1 ? "s" : ""}
                                  </span>
                                </div>
                                {part.output?.query && (
                                  <div className="text-slate-500 italic ml-6">
                                    "{part.output.query}"
                                  </div>
                                )}
                                {messageLocations.length > 0 && (
                                  <div className="ml-6 mt-2 flex items-center gap-2">
                                    <button
                                      onClick={() =>
                                        handleShowLocations(
                                          message.id,
                                          messageLocations
                                        )
                                      }
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        isActive
                                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                          : "bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-700 hover:border-slate-500"
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <svg
                                          className="w-3.5 h-3.5"
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
                                        {isActive
                                          ? "Showing on map"
                                          : "Show on map"}
                                      </div>
                                    </button>

                                    {/* Toggle button - only show for single location with polygon geometry */}
                                    {hasPolygon && isActive && (
                                      <button
                                        onClick={() =>
                                          handleToggleView(
                                            message.id,
                                            currentViewMode
                                          )
                                        }
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-700 hover:border-slate-500 transition-all"
                                        title={
                                          currentViewMode === "marker"
                                            ? "Show as polygon"
                                            : "Show as marker"
                                        }
                                      >
                                        <div className="flex items-center gap-1.5">
                                          {currentViewMode === "marker" ? (
                                            <>
                                              <svg
                                                className="w-3.5 h-3.5"
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
                                              Polygon
                                            </>
                                          ) : (
                                            <>
                                              <svg
                                                className="w-3.5 h-3.5"
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
                                              </svg>
                                              Marker
                                            </>
                                          )}
                                        </div>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );

                    default:
                      return null;
                  }
                })}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 rounded-2xl px-4 py-3 shadow-lg border border-slate-700/50">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="border-t border-slate-800 p-5 bg-slate-900/50 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              className="flex-1 bg-slate-800 text-slate-100 px-4 py-3.5 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-sm placeholder-slate-500 transition-all"
              value={input}
              placeholder="Ask about places or just chat..."
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input?.trim()}
              className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed transition-all font-semibold text-sm shadow-lg shadow-emerald-500/20 disabled:shadow-none"
            >
              Send
            </button>
          </form>
          <div className="text-xs text-slate-500 mt-3 text-center flex items-center justify-center gap-2">
            <svg
              className="w-3.5 h-3.5 text-slate-600"
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
            Powered by OpenStreetMap Nominatim API
          </div>
        </div>
      </div>

      {/* Map Panel */}
      <div className="w-2/3 relative">
        {viewMode[activeMessageId] === "polygon" ? (
          <PolygonMap locations={locations} />
        ) : (
          <MarkerMap locations={locations} />
        )}
      </div>
    </div>
  );
}
