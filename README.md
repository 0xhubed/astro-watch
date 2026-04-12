# AstroWatch

### https://www.astro-watch.com/

A personal project that visualizes near-Earth asteroid data from NASA in a 3D scene, with an AI chat interface and some experimental automation. Built with Next.js, Three.js, and a couple of AI integrations (Ollama Cloud for chat, Claude for a periodic monitoring agent).

> **Disclaimer**: This is a hobby project — not a scientific tool or production system. Risk labels, AI-generated summaries, impact estimates, and orbital positions are approximate and often simplified. For authoritative asteroid data, refer to [NASA/JPL CNEOS](https://cneos.jpl.nasa.gov/) and ESA.

## Features

### 3D Visualization
- **Solar System Scene** — Earth, Moon, Sun, and asteroid orbits in a Three.js scene (positions are simplified for display, not orbital-mechanics-accurate)
- **Procedural Asteroids** — GPU-instanced rendering with per-asteroid geometry
- **Camera Modes** — Auto-orbit, follow-asteroid, and manual controls

### AI Chat
- **Chat Interface** — Ask questions about asteroids, navigate the scene, look up data
- **Tool-Calling** — The model can select asteroids, change views, and run simulations
- **Streaming** — SSE-based chat via Ollama Cloud (Gemma 4 1B Cloud)

### Periodic Agent (experimental)
- **Advisor Pattern** — Haiku executor with Opus advisor for higher-stakes decisions
- **4-Hour Cron** — Checks for new asteroid data and writes short summaries
- **Summaries** — Published at `/briefings` and `/threats/[id]` (AI-generated, not expert analysis)
- **Memory** — Vercel KV stores context across runs
- **Email Alerts** — Optional Resend-based notifications for notable approaches

### Charts & Dashboards
- **Risk Overview** — Charts for size distribution, approach frequency, and basic risk labels
- **Approach Timeline** — Timeline of upcoming close approaches
- **Trajectory View** — Hyperbolic flyby distance curves

### Impact Simulation
- **Globe** — Globe.gl-based 3D Earth with selectable impact points
- **Simplified Physics** — Crater scaling and blast wave estimates loosely based on Collins et al. 2005 (educational approximation, not a rigorous model)

### Daily Discovery
- **NASA APOD** — Astronomy Picture of the Day with date navigation at `/apod`

## Tech Stack

### Framework & UI
- **Next.js 15** (App Router) with **React 19** and **TypeScript**
- **Tailwind CSS 4** with custom space theme and risk color palette
- **Framer Motion** for animations

### 3D Graphics
- **Three.js 0.178** via **React Three Fiber** + **Drei**
- **Globe.gl** for impact visualizations

### Data & State
- **Zustand** for client state
- **TanStack Query** for server state (5min cache / 15min refetch)
- **Recharts** for chart components

### AI
- **Ollama Cloud** (gemma4:31b-cloud) — OpenAI-compatible chat API with tool-calling
- **Anthropic SDK** (Claude) — Periodic monitoring agent
- **Vercel KV** — Agent memory persistence

### Infrastructure
- **Vercel** — Hosting, serverless functions, cron jobs
- **Resend** — Email alerts for critical asteroids
- **NASA NEO API** + **NASA APOD API** — Data sources

## Getting Started

### Prerequisites
- Node.js 18+
- NASA API Key (free from [api.nasa.gov](https://api.nasa.gov/))

### Installation

```bash
git clone https://github.com/0xhubed/astro-watch.git
cd astro-watch/astro-watch
npm install
```

### Environment Variables

```bash
cp .env.example .env.local
```

Required:
```env
NASA_API_KEY=your_nasa_api_key
OLLAMA_CLOUD_API_KEY=your_ollama_cloud_api_key
OLLAMA_CLOUD_BASE_URL=https://ollama.com/v1
```

Optional (agent + alerts):
```env
CRON_SECRET=your_vercel_cron_secret
ANTHROPIC_API_KEY=your_anthropic_api_key
KV_REST_API_URL=your_vercel_kv_url
KV_REST_API_TOKEN=your_vercel_kv_token
RESEND_API_KEY=your_resend_api_key
ALERT_TO_EMAIL=recipient@example.com
ALERT_FROM_EMAIL=alerts@your-domain.com
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
astro-watch/
├── app/
│   ├── api/
│   │   ├── agent-data/        # Agent annotations & briefings endpoint
│   │   ├── apod/              # Astronomy Picture of the Day proxy
│   │   ├── asteroids/         # NASA NEO API integration
│   │   ├── chat/              # SSE streaming chat with tool-calling
│   │   └── monitoring/        # Autonomous Claude agent (4h cron)
│   ├── apod/                  # APOD page
│   ├── briefings/             # Agent-published briefings
│   ├── dashboard/             # Main dashboard
│   └── threats/[id]/          # Individual threat assessments
├── components/
│   ├── apod/                  # Picture of the Day UI
│   ├── chat/                  # Chat panel and message components
│   ├── simulation/            # Impact simulation modal with globe
│   ├── tour/                  # Guided onboarding tour
│   └── visualization/
│       ├── 3d/                # Three.js solar system, procedural asteroids, camera
│       ├── analysis/          # Trajectory analysis, monitoring dashboard
│       ├── charts/            # Risk dashboard, approach timeline
│       ├── controls/          # Desktop and mobile controls
│       └── maps/              # Impact heatmap and risk map
├── lib/
│   ├── agent/                 # Agent memory (KV), tools, core loop
│   ├── chat/                  # Chat tools, system prompt builder
│   ├── nasa-api.ts            # NASA API client and data enrichment
│   ├── impact-physics.ts      # Collins et al. 2005 crater scaling
│   ├── approach-curve.ts      # Hyperbolic flyby computation
│   ├── store.ts               # Zustand store
│   └── ...                    # Rarity scoring, rate limiting, content filtering
└── public/textures/           # Earth, Moon, Sun textures
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/asteroids?range=[day\|week\|month]` | GET | Enriched asteroid data (7-day NASA API limit) |
| `/api/chat` | POST | SSE streaming chat with Ollama Cloud tool-calling |
| `/api/agent-data` | GET | Agent annotations and latest briefing |
| `/api/monitoring` | GET | Trigger monitoring agent (requires `CRON_SECRET`) |
| `/api/apod?date=YYYY-MM-DD` | GET | Astronomy Picture of the Day (CDN cached) |

## Deployment

Deployed on Vercel with a 4-hourly cron for the monitoring agent:

```bash
npm run deploy
```

The `vercel.json` configures function timeouts, caching headers, and the `/api/monitoring` cron schedule (`0 */4 * * *`). CORS is handled by Next.js middleware.

## Contact

Questions, feedback, or contributions: [danielhuber.dev@proton.me](mailto:danielhuber.dev@proton.me)

## Acknowledgments

- **NASA** for the Near Earth Object Web Service and APOD API
- **Three.js** and **React Three Fiber** communities
- **Anthropic** and **Ollama** for AI model access
- **Vercel** for hosting and infrastructure

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

*A hobby project for browsing near-Earth asteroid data in 3D.*
