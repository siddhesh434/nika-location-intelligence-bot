// app/api/chat/route.js
import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, tool } from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-5-mini"),
    messages: convertToModelMessages(messages),
    tools: {
      searchLocation: tool({
        description: `Search for real-world locations, places, addresses, or points of interest using OpenStreetMap data. 
        Use this tool ONLY when the user explicitly asks about:
        - Finding places (e.g., "show me cafes", "find restaurants", "where is the nearest park")
        - Searching for locations (e.g., "locate hospitals in Berlin", "search for gyms")
        - Getting addresses or coordinates (e.g., "where is Times Square", "find Eiffel Tower")
        - Asking about specific place types (restaurants, hotels, museums, etc.)
        
        DO NOT use this tool for:
        - General questions or chit-chat (e.g., "how are you", "tell me a joke")
        - Questions about concepts, definitions, or explanations
        - Weather, news, or other non-location queries
        - Recommendations without location context (e.g., "what should I do today" - ask for location first)`,
        inputSchema: z.object({
          query: z
            .string()
            .describe(
              "The search query: place type, name, or address (e.g., 'cafe', 'Central Park New York', 'restaurants', 'Eiffel Tower')"
            ),
          city: z
            .string()
            .optional()
            .describe(
              "Optional: specific city/location to search in (e.g., 'Berlin', 'New York', 'Tokyo')"
            ),
          limit: z
            .number()
            .optional()
            .default(10)
            .describe(
              "Maximum number of results to return (default: 10, max: 50)"
            ),
        }),
        execute: async ({ query, city, limit = 10 }) => {
          try {
            // Build search query
            const searchQuery = city ? `${query} ${city}` : query;
            const limitParam = Math.min(limit, 50); // Cap at 50 results

            // Call Nominatim API
            const url = new URL("https://nominatim.openstreetmap.org/search");
            url.searchParams.set("q", searchQuery);
            url.searchParams.set("format", "json");
            url.searchParams.set("addressdetails", "1");
            url.searchParams.set("limit", limitParam.toString());
            url.searchParams.set("polygon_geojson", "1"); // Get polygon data

            console.log("Nominatim API URL:", url.toString());

            const response = await fetch(url.toString(), {
              headers: {
                "User-Agent": "NikaLocationBot/1.0", // Nominatim requires a User-Agent
              },
            });

            if (!response.ok) {
              throw new Error(`Nominatim API error: ${response.status}`);
            }

            const data = await response.json();

            // Transform Nominatim response to our format
            const locations = data.map((place) => ({
              name: place.display_name,
              lat: parseFloat(place.lat),
              lng: parseFloat(place.lon),
              type: place.type || place.class || "place",
              address: place.address || {},
              importance: place.importance,
              placeId: place.place_id,
              // Include polygon if available
              polygon: place.geojson,
            }));

            console.log(
              `Found ${locations.length} locations for query: ${searchQuery}`
            );

            return {
              locations,
              query: searchQuery,
              count: locations.length,
            };
          } catch (error) {
            console.error("Location search error:", error);
            return {
              locations: [],
              query,
              error: error.message,
              count: 0,
            };
          }
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
