# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AstroWatch is an interactive 3D visualization and ML playground for exploring near-Earth asteroids. It combines NASA NEO API data with client-side TensorFlow.js predictions and Three.js visualizations. Live at https://www.astro-watch.com/.

The application code lives in `astro-watch/` (not the repo root).

## Commands

All commands run from the `astro-watch/` directory:

```bash
npm run dev          # Dev server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint (next/core-web-vitals + next/typescript)
npm run typecheck    # tsc --noEmit
npm run ml:train     # Compile and train ML models (builds TS first)
npm run deploy       # Run deploy script
```

## Tech Stack

- **Framework:** Next.js 15 (App Router) with React 19 and TypeScript
- **Styling:** Tailwind CSS 4 with custom space theme (see `tailwind.config.ts` for risk colors, animations)
- **3D:** Three.js via React Three Fiber + Drei + PostProcessing
- **State:** Zustand (client state in `lib/store.ts`) + TanStack Query (server state, 5min cache / 15min refetch)
- **ML:** TensorFlow.js client-side, 6D feature vectors, auto-trains in browser if no pre-trained model
- **Data:** NASA NEO API, NASA APOD API
- **Alerts:** Resend email service for critical asteroid notifications
- **Deployment:** Vercel with daily cron at 00:00 UTC for `/api/monitoring`

## Architecture

### Data Flow

1. **API routes** (`app/api/asteroids/route.ts`) fetch from NASA NEO API
2. **Server enrichment** (`lib/nasa-api.ts`) calculates risk, orbital parameters, rarity scores, 3D positions, moon collision probability
3. **Client ML** (`hooks/useMLPredictions.ts`) enhances with TensorFlow.js predictions non-blockingly
4. **Visualization** components consume `EnhancedAsteroid` objects

### Key Directories (under `astro-watch/`)

- `app/` - Next.js App Router pages and API routes
- `components/visualization/3d/` - Three.js solar system and asteroid detail views
- `components/visualization/charts/` - Recharts-based analytics dashboards
- `components/visualization/maps/` - Globe.gl impact visualizations
- `lib/ml/` - ML pipeline: feature engineering, risk prediction, browser training, data generation
- `lib/nasa-api.ts` - NASA API client and asteroid data enrichment (core data pipeline)
- `lib/store.ts` - Zustand store (asteroids, filters, view mode, selected asteroid)
- `hooks/` - Custom React hooks
- `public/models/` - Pre-trained TensorFlow.js model weights
- `public/textures/` - Earth, moon, sun textures for 3D views

### API Routes

- `GET /api/asteroids?range=[day|week|month]` - Enriched asteroid data (7-day NASA API limit)
- `GET /api/apod?date=YYYY-MM-DD` - Astronomy Picture of the Day (24h cache)
- `GET /api/monitoring?dryRun=[0|1]` - Cron endpoint for critical asteroid email alerts

### ML Pipeline

The ML system uses a 6D feature vector (size, velocity, distance, PHA flag, kinetic energy, close approach threshold). It tries to load a pre-trained model from `/models/asteroid-risk-model/model.json` (cached 24h), falls back to training in-browser with 5000 synthetic samples over 50 epochs.

### Server vs Client Split

- **Server:** NASA API calls, data enrichment, risk calculations, email alerts
- **Client:** ML predictions, 3D rendering (Three.js), interactive controls, globe visualization

## Environment Variables

Copy `.env.example` to `.env.local`. Required: `NASA_API_KEY`. Optional: `RESEND_API_KEY` and `NOTIFICATION_EMAIL` for alert emails.

## Path Alias

`@/*` maps to the `astro-watch/` root (e.g., `@/lib/nasa-api`, `@/components/ui/`).

## Notes

- ESLint is ignored during builds (`next.config.ts`)
- React strict mode is disabled
- `reactStrictMode: false` is intentional for Three.js compatibility
- Images allowed from `nasa.gov`, `apod.nasa.gov`, `unpkg.com`
- Feature branches follow `ticket/<Feature>` or `claude/<description>` naming
