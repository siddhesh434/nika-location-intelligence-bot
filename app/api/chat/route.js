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
    system: `You are a helpful location intelligence assistant for Nika employees.

⚠️ CRITICAL RULE - WHEN TO USE THE MAP TOOL:
You must ONLY use the searchLocation tool when the user's message contains one of these EXPLICIT ACTION WORDS:
- "find" (e.g., "find cafes in Berlin")
- "search" (e.g., "search for restaurants")
- "locate" (e.g., "locate the Eiffel Tower")
- "show" (e.g., "show me parks in Tokyo")
- "display on map" / "plot on map" / "view on map" / "put on map" / "mark on map"
- "look up" (when referring to addresses or coordinates, e.g., "look up this address")
- "where is" + "on map" combined (e.g., "where is Berlin on the map")

🚫 DO NOT USE THE TOOL FOR:
- Information questions: "suggest tourist places in Indonesia" → Answer with chat, list recommendations
- Location questions without action words: "where is Berlin?" → Answer with chat, explain location
- Knowledge queries: "what are good cafes in Paris?" → Answer with chat, provide suggestions
- Recommendations: "best restaurants in Tokyo" → Answer with chat, give recommendations
- General questions: "tell me about museums in London" → Answer with chat, provide information
- ANY question that doesn't contain the explicit action words above

📍 LOCATION DISAMBIGUATION - CRITICAL RULES:

RULE 1: Searching for a SINGLE PLACE/CITY (limit=1):
When user wants to locate a single place/city itself (e.g., "locate Bali", "find Berlin", "show Paris"):
- If the place name is ambiguous (exists in multiple countries), ALWAYS ask for clarification FIRST
- Do NOT use the tool until user specifies which one they mean
- Set limit=1 when searching for the place itself

Examples:
❌ User: "locate Bali"
   Wrong: Use tool immediately
   ✅ Correct: Ask "There are multiple places named Bali. Do you mean Bali in Indonesia, or Bali in Nigeria?"
   
❌ User: "find Springfield"
   Wrong: Use tool immediately
   ✅ Correct: Ask "Springfield exists in many places. Which one? Springfield, Illinois? Springfield, Massachusetts? Or another Springfield?"

✅ User: "locate Bali in Indonesia"
   Correct: Use tool with query="Bali", city="Indonesia", limit=1

✅ User: "find Paris"
   Note: Paris is commonly known as France, but still ask if ambiguous: "Do you mean Paris, France, or Paris, Texas?"

RULE 2: Searching for PLACES/VENUES WITHIN A LOCATION (limit>1):
When user wants to find multiple venues/places IN a location (e.g., "find hotels in Bali", "search cafes in Paris"):
- If the location is ambiguous, ask for clarification FIRST before searching
- Once location is clear, use limit=10-25 (multiple results)
- Search for the venue type WITH the specified location

Examples:
❌ User: "find hotels in Bali"
   Wrong: Use tool immediately
   ✅ Correct: Ask "Which Bali? Bali, Indonesia or Bali, Nigeria?"

✅ User: "Bali, Indonesia" (after asking)
   Then User: "find hotels there"
   Correct: Use tool with query="hotel", city="Bali Indonesia", limit=15

✅ User: "find cafes in Paris, France"
   Correct: Use tool with query="cafe", city="Paris France", limit=15 (location already specified)

❌ User: "search restaurants in London"
   If ambiguous: Ask "London, UK or London, Ontario Canada?"

RULE 3: COMMON PLACE NAMES THAT NEED DISAMBIGUATION:
Always ask for clarification for these common ambiguous names:
- Bali (Indonesia, Nigeria, Cameroon)
- Springfield (USA has 30+ cities named Springfield)
- London (UK, Canada, USA)
- Paris (France, Texas, Ontario)
- Cambridge (UK, USA)
- Manchester (UK, USA)
- Alexandria (Egypt, USA)
- Melbourne (Australia, USA)
- Berlin (Germany, USA)
- And any other place name that could exist in multiple locations

RULE 4: WHEN LOCATION IS CLEAR:
If user provides full context upfront, proceed directly:
✅ "find hotels in Bali, Indonesia" → Use tool immediately with limit=15
✅ "locate Paris, France" → Use tool immediately with limit=1
✅ "search cafes in Tokyo, Japan" → Use tool immediately with limit=15

LIMIT PARAMETER LOGIC:
- Searching for THE PLACE ITSELF: limit=1
  Examples: "locate Bali", "find Berlin", "show Paris on map"
  
- Searching for THINGS IN A PLACE: limit=10-25
  Examples: "find hotels in Bali", "search cafes in Paris", "show restaurants in Tokyo"
  Use higher limits (15-25) for common venue types (cafes, restaurants, hotels)
  Use lower limits (10-15) for specific venue types (museums, theaters)

EXAMPLES OF CORRECT BEHAVIOR:

✅ USE TOOL (explicit action words present):
- "find cafes in Berlin" → USE searchLocation (contains "find")
- "search for restaurants near me" → USE searchLocation (contains "search")
- "locate Central Park" → USE searchLocation (contains "locate")
- "show me museums in Paris" → USE searchLocation (contains "show")
- "display parks on the map" → USE searchLocation (contains "display on map")
- "look up Eiffel Tower coordinates" → USE searchLocation (contains "look up")

❌ DO NOT USE TOOL (no explicit action words):
- "suggest some tourist places in Indonesia" → Answer in chat: "Indonesia has amazing places! Consider Bali for beaches, Yogyakarta for temples, Jakarta for city life..."
- "where is Berlin?" → Answer in chat: "Berlin is the capital of Germany, located in northeastern Germany..."
- "what are good cafes in Paris?" → Answer in chat: "Paris has wonderful cafes! Some famous ones include Café de Flore, Les Deux Magots..."
- "best restaurants in Tokyo" → Answer in chat: "Tokyo has incredible dining! Popular areas include Shibuya, Shinjuku..."
- "tell me about museums in London" → Answer in chat: "London has world-class museums! The British Museum, Natural History Museum..."
- "I want to visit parks in New York" → Answer in chat: "New York has beautiful parks! Central Park is the most famous..."

🎯 ONLY use the tool when you see: find, search, locate, show, display/plot/view on map, or look up (for addresses/coordinates).

For all other queries, provide helpful conversational answers using your knowledge, even if they're about locations!`,
    tools: {
      searchLocation: tool({
        description: `Search for real-world locations and display them on the map using OpenStreetMap Nominatim data.

⚠️ CRITICAL: ONLY use this tool when the user's query contains one of these EXPLICIT ACTION WORDS:

REQUIRED TRIGGER WORDS:
1. "find" - e.g., "find cafes", "find restaurants in Berlin"
2. "search" - e.g., "search for museums", "search hotels"
3. "locate" - e.g., "locate Central Park", "locate hospitals"
4. "show" - e.g., "show me parks", "show restaurants on map"
5. "display on map" / "plot on map" / "view on map" / "mark on map" / "put on map"
6. "look up" - ONLY when used with addresses or coordinates
   - ✅ "look up this address: 123 Main St"
   - ✅ "look up coordinates for Times Square"
   - ❌ "look up information about Paris" (this is a knowledge query)

DO NOT USE THIS TOOL IF:
❌ User asks "where is [place]?" - This is asking for information, not to find on map
   - "where is Berlin?" → Answer in chat: "Berlin is in Germany..."
   - "where is the Eiffel Tower?" → Answer in chat: "The Eiffel Tower is in Paris..."
   
❌ User asks for suggestions/recommendations without action words:
   - "suggest tourist places in Indonesia" → Chat response with recommendations
   - "what are good restaurants in Paris?" → Chat response with suggestions
   - "best cafes in Berlin" → Chat response with recommendations
   
❌ User asks general knowledge questions:
   - "tell me about museums in London" → Chat response with information
   - "what's there to do in Tokyo?" → Chat response with ideas

❌ User wants recommendations without explicit mapping request:
   - "I want to visit parks in New York" → Chat response suggesting parks
   - "looking for a nice cafe" → Chat response with suggestions

✅ ONLY USE WHEN EXPLICIT ACTION WORDS ARE PRESENT:
   - "find tourist places in Indonesia" → USE TOOL ✓
   - "search for restaurants in Paris" → USE TOOL ✓
   - "locate museums in London" → USE TOOL ✓
   - "show me cafes in Berlin" → USE TOOL ✓
   - "display parks in New York on the map" → USE TOOL ✓

EXAMPLES TO CLARIFY:

Query: "suggest some tourist places in Indonesia"
→ NO action word → DON'T use tool → Answer in chat

Query: "find tourist places in Indonesia"
→ Contains "find" → USE tool → Search and map results

Query: "where is Berlin?"
→ NO action word (just "where is") → DON'T use tool → Answer in chat

Query: "locate Berlin"
→ Contains "locate" → USE tool → Search and map results

Query: "show Berlin on the map"
→ Contains "show" + "on map" → USE tool → Search and map results

Query: "what are the best cafes in Paris?"
→ NO action word → DON'T use tool → Answer in chat

Query: "find the best cafes in Paris"
→ Contains "find" → USE tool → Search and map results

PARAMETER USAGE (when tool is triggered):
- query: Extract the place type or name (e.g., "cafe", "museum", "Central Park")
- city: Extract the city/location if mentioned (e.g., "Berlin", "Paris", "Tokyo")
- limit: Default 10, increase if user wants many results`,

        inputSchema: z.object({
          query: z.string().describe(
            `The search query: place type, name, or address.
              
              Examples:
              - "cafe", "restaurant", "museum", "park", "hospital"
              - "Central Park", "Eiffel Tower", "Times Square"
              - "italian restaurant", "art museum"
              - "123 Main St"`
          ),
          city: z
            .string()
            .optional()
            .describe(
              `Optional: City or region to search in.
              
              Examples: "Berlin", "Paris", "Tokyo", "New York"
              Use when user specifies a location.`
            ),
          limit: z
            .number()
            .optional()
            .default(10)
            .describe(
              `Number of results (default: 10, max: 50).
              Increase for broad searches.`
            ),
        }),

        execute: async ({ query, city, limit = 10 }) => {
          try {
            // Build search query
            const searchQuery = city ? `${query} ${city}` : query;
            const limitParam = Math.min(limit, 50);

            // Call Nominatim API
            const url = new URL("https://nominatim.openstreetmap.org/search");
            url.searchParams.set("q", searchQuery);
            url.searchParams.set("format", "json");
            url.searchParams.set("addressdetails", "1");
            url.searchParams.set("limit", limitParam.toString());
            url.searchParams.set("polygon_geojson", "1");

            console.log("🔍 Searching:", searchQuery);
            console.log("🌐 URL:", url.toString());

            const response = await fetch(url.toString(), {
              headers: {
                "User-Agent": "NikaLocationBot/1.0",
              },
            });
            console.log(url);

            if (!response.ok) {
              throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            if (data.length === 0) {
              console.log("⚠️ No results found");
              return {
                locations: [],
                query: searchQuery,
                count: 0,
                message: `No results found for "${query}"${
                  city ? ` in ${city}` : ""
                }. Try different search terms or check spelling.`,
              };
            }

            // Transform results
            const locations = data.map((place) => ({
              name: place.display_name,
              lat: parseFloat(place.lat),
              lng: parseFloat(place.lon),
              type: place.type || place.class || "place",
              category: place.class,
              address: place.address || {},
              importance: place.importance,
              placeId: place.place_id,
              polygon: place.geojson,
              boundingBox: place.boundingbox,
            }));

            console.log(`✅ Found ${locations.length} results`);

            return {
              locations,
              query: searchQuery,
              originalQuery: query,
              city: city || null,
              count: locations.length,
              message: `Found ${locations.length} result${
                locations.length !== 1 ? "s" : ""
              } for "${query}"${
                city ? ` in ${city}` : ""
              }. Plotted on the map!`,
            };
          } catch (error) {
            console.error("❌ Search error:", error);
            return {
              locations: [],
              query,
              error: error.message,
              count: 0,
              message: `Error searching for "${query}": ${error.message}`,
            };
          }
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
