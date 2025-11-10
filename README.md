This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Project Architecture

- **UI (App Router)**: `app/page.js`

  - Client component using `@ai-sdk/react` `useChat()` for chat streaming.
  - Renders a split view: chat panel (left) and map panel (right).
  - Parses tool outputs of type `tool-searchLocation` from assistant messages, extracts `locations`, and renders:
    - `app/components/MakerMap.js` for point markers view.
    - `app/components/PolygonMap.js` for polygon boundary view (when available for a single location).
  - Provides a toggle to switch between Marker and Polygon view for single-location results with polygon geometry.

- **Maps**:

  - `app/components/MakerMap.js`: MapLibre map that adds/removes markers for all returned `locations`, auto-fits bounds, and shows styled popups.
  - `app/components/PolygonMap.js`: MapLibre map that draws the polygon GeoJSON (`location.polygon`) for the first location, adds an outline and marker, and fits to the `boundingBox`.
  - Both components use a public Carto basemap style and require no map API key.

- **AI + Tools API**: `app/api/chat/route.js`

  - Streams responses using the Vercel AI SDK `streamText` with the OpenAI provider (`@ai-sdk/openai`).
  - Defines a `searchLocation` tool that calls OpenStreetMap Nominatim (`https://nominatim.openstreetmap.org/search`) with:
    - `q`, `format=json`, `addressdetails=1`, `limit`, `polygon_geojson=1`.
    - Custom `User-Agent` header set to `NikaLocationBot/1.0` (required by Nominatim usage policy).
  - Returns structured tool output (`locations`, `count`, `query`, etc.) that the client reads to drive the map.

- **Data Sources**
  - Chat model: OpenAI via `@ai-sdk/openai` (requires `OPENAI_API_KEY`).
  - Geocoding/POI search: OpenStreetMap Nominatim (no API key required, but respectful usage needed).

## Installation and Setup

### Prerequisites

- Node.js 18+ (or the version supported by your Next.js setup)
- Package manager: npm, yarn, pnpm, or bun

### 1) Install dependencies

```bash
npm install
# or: yarn install / pnpm install / bun install
```

### 2) Configure environment variables (API Keys)

Create a `.env.local` file in the project root with your OpenAI API key:

```bash
cp .env.local.example .env.local  # if you create an example file, otherwise create fresh
```

Then add:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

Notes:

- The AI model is configured via `@ai-sdk/openai` inside `app/api/chat/route.js` and expects `OPENAI_API_KEY` to be present in the server runtime.
- Map rendering uses MapLibre with a public Carto basemap URL, so no map API key is needed.
- The Nominatim endpoint is public; the code already sets a `User-Agent`. Please keep usage reasonable to respect rate limits and usage policies.

Optional environment variables (only if you want to customize):

- None required. If you want to change the Nominatim `User-Agent`, edit `app/api/chat/route.js`.

### 3) Run the app

```bash
npm run dev
# or: yarn dev / pnpm dev / bun dev
```

Open http://localhost:3000

### 4) Usage tips

- To trigger map searches, include explicit action words in your prompt (the assistant is configured to only call the map tool when it sees them):
  - “find”, “search”, “locate”, “show”, “display/plot/view/mark/put on map”, or “look up” (for addresses/coordinates).
- Examples:
  - “find cafes in Paris”
  - “locate the Eiffel Tower”
  - “show museums in Berlin”
- For general chat or recommendations without mapping, just ask normally (e.g., “suggest tourist places in Indonesia”).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
