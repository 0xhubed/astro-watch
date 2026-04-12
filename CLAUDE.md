# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AstroWatch is a personal project that visualizes near-Earth asteroid data from NASA in a 3D scene, with an AI chat interface and experimental periodic monitoring. Built with Next.js, Three.js, Ollama Cloud (chat), and Claude (monitoring agent). Live at https://www.astro-watch.com/.

The application code lives in `astro-watch/` (not the repo root).

## Commands

All commands run from the `astro-watch/` directory:

```bash
npm run dev          # Dev server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint (next/core-web-vitals + next/typescript)
npm run typecheck    # tsc --noEmit
npm run deploy       # Run deploy script
```

## Tech Stack

- **Framework:** Next.js 15 (App Router) with React 19 and TypeScript
- **Styling:** Tailwind CSS 4 with custom space theme (see `tailwind.config.ts` for risk colors, animations)
- **3D:** Three.js 0.178 via React Three Fiber + Drei (postprocessing disabled — incompatible with Three.js 0.178)
- **State:** Zustand (client state in `lib/store.ts`) + TanStack Query (server state, 5min cache / 15min refetch)
- **Chat AI:** Ollama Cloud (gemma4:31b-cloud) via OpenAI-compatible API at https://ollama.com/v1
- **Agent AI:** Claude Advisor Strategy (Haiku executor + Opus advisor) via Anthropic SDK, runs every 4h via Vercel Cron
- **Agent Memory:** Vercel KV (Upstash Redis) with TTLs (falls back to in-memory for local dev). Uses `@vercel/kv` — do NOT install `@upstash/redis` separately.
- **Data:** NASA NEO API, NASA APOD API
- **Alerts:** Resend email service for critical asteroid notifications
- **Deployment:** Vercel with 4-hourly cron for `/api/monitoring` (autonomous agent)

## Architecture

### Data Flow

1. **API routes** (`app/api/asteroids/route.ts`) fetch from NASA NEO API
2. **Server enrichment** (`lib/nasa-api.ts`) calculates risk (rule-based), orbital parameters, rarity scores, 3D positions
3. **Chat assistant** (`/api/chat`) streams responses via Ollama Cloud with tool-calling (scene control, data queries)
4. **Autonomous agent** (`/api/monitoring`) runs Claude every 4h to analyze data, publish briefings, annotate scene
5. **Visualization** components consume `EnhancedAsteroid` objects

### Dual-Model AI Architecture

- **Chat** (`/api/chat`): Ollama Cloud OpenAI-compatible API, gemma4:31b-cloud, SSE streaming, tool-calling for scene control
- **Agent** (`/api/monitoring`): Anthropic SDK, Advisor Strategy — Haiku executor with Opus advisor (`max_uses: 3`) for high-stakes decisions (alerts, threat levels). Persistent memory via Vercel KV, publishes to `/briefings` and `/threats/[id]`

### Key Directories (under `astro-watch/`)

- `app/` - Next.js App Router pages and API routes
- `components/visualization/3d/` - Three.js solar system, procedural asteroids, particle effects, cinematic camera
- `components/visualization/charts/` - Recharts-based analytics dashboards, approach timelines
- `components/visualization/maps/` - Globe.gl impact visualizations
- `components/chat/` - Chat panel UI with SSE streaming
- `components/simulation/` - Impact simulation modal with globe and physics
- `components/tour/` - Guided tour onboarding (3-step)
- `lib/nasa-api.ts` - NASA API client and asteroid data enrichment (core data pipeline)
- `lib/chat/` - Chat tools, system prompt builder
- `lib/agent/` - Autonomous agent: memory (KV), tools, core loop
- `lib/impact-physics.ts` - Collins et al. 2005 crater scaling, blast wave calculations
- `lib/approach-curve.ts` - Hyperbolic flyby distance computation
- `lib/store.ts` - Zustand store (asteroids, filters, view mode, chat state, modal state)
- `public/textures/` - Earth, moon, sun textures for 3D views

### API Routes

- `GET /api/asteroids?range=[day|week|month]` - Enriched asteroid data (7-day NASA API limit)
- `POST /api/chat` - SSE streaming chat with Ollama Cloud tool-calling
- `GET /api/agent-data` - Returns agent annotations and briefing for client
- `GET /api/monitoring?dryRun=[0|1]` - Triggers monitoring agent (4h cron, requires `CRON_SECRET` auth)
- `GET /api/apod?date=YYYY-MM-DD` - Astronomy Picture of the Day (CDN cached: 1h s-maxage, 24h stale-while-revalidate)

### Server vs Client Split

- **Server:** NASA API calls, data enrichment, risk calculations, chat API proxy, agent execution, email alerts
- **Client:** 3D rendering (Three.js), interactive controls, chat UI, impact simulation, globe visualization

## Environment Variables

Copy `.env.example` to `.env.local`. Required: `NASA_API_KEY`, `OLLAMA_CLOUD_API_KEY`, `OLLAMA_CLOUD_BASE_URL`. Optional: `CRON_SECRET` (required in production — protects `/api/monitoring`), `ANTHROPIC_API_KEY` (agent), `KV_REST_API_URL`/`KV_REST_API_TOKEN` (agent memory), `RESEND_API_KEY`/`ALERT_TO_EMAIL`/`ALERT_FROM_EMAIL` (alerts — sender defaults to `onboarding@resend.dev`).

## Path Alias

`@/*` maps to the `astro-watch/` root (e.g., `@/lib/nasa-api`, `@/components/ui/`).

## Gotchas

- `/api/chat` has `maxDuration: 60` and `/api/monitoring` has `maxDuration: 60` — Vercel Pro plan (up to 300s for streaming)
- `@react-three/postprocessing` EffectComposer causes flickering with Three.js 0.178 — disabled, do not re-enable without testing
- R3F `Html` component renders in a DOM portal that ignores z-index — use `body.modal-open` CSS class to hide labels when modals are open
- R3F `Html` portals also escape parent `overflow-hidden` — `overflow-x: hidden` on `html`/`body` is needed on mobile only (applying to `html` on desktop causes a visible rendering artifact)
- Mobile has fixed FABs in all corners (chat FAB bottom-right, asteroid list toggle bottom-left-14, tour "?" bottom-left-4) — check ALL corners before placing new fixed buttons
- `hideLabels` prop on 3D components (planets, Earth, Moon, AsteroidField) must include `!!selectedAsteroid` — labels render on top of the inline AsteroidInfoPanel otherwise
- Dashboard view (`viewMode === 'dashboard'`) needs constrained height + `overflow-y-auto` on mobile; the 3D and Analysis views use `h-[calc(100dvh-8rem)]` — dashboard must match this pattern
- Vercel Analytics custom events via `track()` from `@vercel/analytics` are used to track chat usage (`chat_message` event in `ChatPanel.tsx`)
- Stale `.next` Turbopack cache can cause runtime errors — fix with `rm -rf .next`
- Ollama Cloud API is OpenAI-compatible: base URL `https://ollama.com/v1`, endpoint `/chat/completions`, Bearer auth
- The Ollama Cloud setup matches the pattern in `~/Documents/projects/modelrisk/configs/models.yaml`
- NASA APOD API returns transient 503s — `getAPOD()` retries once with 1s delay; `/api/apod` route returns 503 with `Retry-After` header
- `/api/chat` caches asteroids in-memory (5min TTL) to avoid re-fetching NASA NEO feed on every message — critical for staying within function timeout
- CORS is handled by `middleware.ts` (not `vercel.json`) — allows `astro-watch.com` and `localhost` only
- `lib/rate-limit.ts` is a fixed-window rate limiter (counter + TTL reset), not sliding-window

## Notes

- ESLint is ignored during builds (`next.config.ts`)
- `reactStrictMode: false` is intentional for Three.js compatibility
- Images allowed from `nasa.gov`, `apod.nasa.gov`, `unpkg.com`
- Feature branches follow `ticket/<Feature>` or `claude/<description>` naming
- Contact email: `danielhuber.dev@proton.me` — used in landing page, layout footer, and README instead of personal name
- Copy should be humble and honest — this is a hobby/home project, not a product. Avoid "platform", "engine", "autonomous", and marketing-style language in UI and README
