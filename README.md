# AstroWatch - Near-Earth Asteroid Visualization & AI Platform

### https://www.astro-watch.com/

An interactive 3D visualization and agentic AI platform for exploring near-Earth asteroids. Built with Next.js, Three.js, and a dual-model AI system combining Ollama Cloud chat with an autonomous Claude agent.

> **Disclaimer**: This is an experimental project, not a production-ready risk assessment tool. All risk assessments are for educational and exploratory purposes. For authoritative asteroid data, refer to official sources like NASA/JPL and ESA.

## Features

### 3D Visualization
- **Interactive Solar System** — Real-time 3D scene with Earth, Moon, Sun, and asteroid orbits
- **Procedural Asteroids** — GPU-instanced rendering with unique geometry per asteroid
- **Cinematic Camera** — Auto-orbit, follow-asteroid, and manual camera modes
- **Particle Effects** — Atmospheric and orbital trail effects

### AI Assistant
- **Chat Interface** — Ask questions about asteroids, get risk explanations, control the 3D scene
- **Tool-Calling** — AI can select asteroids, change camera views, query data, and run impact simulations
- **Streaming Responses** — SSE-based real-time chat via Ollama Cloud (Gemma 4 1B Cloud)

### Autonomous Agent
- **Claude Advisor Strategy** — Haiku executor with Opus advisor for high-stakes decisions
- **4-Hour Monitoring Cycle** — Vercel Cron triggers autonomous analysis of new asteroid data
- **Published Briefings** — Agent writes threat assessments at `/briefings` and `/threats/[id]`
- **Persistent Memory** — Vercel KV (Upstash Redis) stores agent context across runs
- **Email Alerts** — Resend-powered notifications for critical asteroid approaches

### Analytics & Dashboards
- **Risk Dashboard** — Charts for risk distribution, approach frequency, and size analysis
- **Approach Timeline** — Interactive timeline of upcoming close approaches
- **Trajectory Analysis** — Hyperbolic flyby distance curves
- **Monitoring Dashboard** — Agent status, annotation history, and briefing feed

### Impact Simulation
- **Globe Visualization** — Globe.gl-based 3D Earth with selectable impact points
- **Physics Engine** — Collins et al. 2005 crater scaling and blast wave calculations
- **What-If Scenarios** — Simulate impacts for any asteroid at any location

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
- **Anthropic SDK** (Claude) — Advisor Strategy autonomous agent
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
| `/api/monitoring?dryRun=[0\|1]` | GET | Trigger autonomous Claude agent |
| `/api/apod?date=YYYY-MM-DD` | GET | Astronomy Picture of the Day (CDN cached) |

## Deployment

Deployed on Vercel with a 4-hourly cron for the autonomous agent:

```bash
npm run deploy
```

The `vercel.json` configures function timeouts, CORS headers, and the `/api/monitoring` cron schedule (`0 */4 * * *`).

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

*An interactive platform for exploring near-Earth asteroids through 3D visualization and agentic AI.*
