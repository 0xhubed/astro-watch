# AstroWatch v2: Cinematic Visuals + Agentic AI

**Date:** 2026-04-06
**Status:** Approved
**Goal:** Elevate AstroWatch from a solid Three.js + TF.js demo into a portfolio-grade reference project showcasing cinematic 3D visuals, a conversational AI assistant, and an autonomous monitoring agent.

## Context

AstroWatch is a Next.js 15 app that visualizes near-Earth asteroids using NASA NEO API data, Three.js (via React Three Fiber), and client-side TensorFlow.js risk predictions. The current ML is effectively function approximation of a rule-based formula — it doesn't discover new patterns. The visuals are solid (custom GLSL shaders, procedural Earth textures, Fresnel atmospherics) but lack post-processing and cinematic polish. There are no agentic AI capabilities.

This upgrade removes TensorFlow.js entirely, adds cinematic post-processing and procedural asteroid rendering, integrates a conversational AI assistant (Qwen 3.5 397B via Ollama Cloud), and builds an autonomous monitoring agent (Claude via Anthropic Agent SDK).

## Architecture: Dual-Model Split

Two independent AI paths sharing a common data layer.

### Chat Path — `/api/chat`

- **Model:** Qwen 3.5 397B via Ollama Cloud (OpenAI-compatible chat completions API with tool-calling support)
- **Purpose:** User-facing conversational assistant with scene control
- **Protocol:** Server-Sent Events (streaming)
- **State:** Stateless per request. Conversation history in client state (Zustand). Last 20 messages sent per request.
- **System prompt:** Includes current asteroid summary, available scene state, latest agent briefing digest. Refreshed per request.

**Tools (Qwen function-calling):**

| Tool | Purpose | Params |
|------|---------|--------|
| `query_asteroids` | Search/filter asteroid data | risk_level, size_range, date_range, sort_by, limit |
| `control_scene` | Manipulate 3D view | action (focus, set_filter, set_view, orbit_camera, toggle_trajectories), target params |
| `get_statistics` | Compute analytics on demand | function (risk_distribution, velocity_histogram, size_comparison, weekly_trend) |
| `get_agent_insights` | Read autonomous agent findings from KV | query (latest_briefing, watchlist, annotations, threat by id) |

**Scene control flow:**
1. User sends natural language message
2. `/api/chat` sends to Qwen with tool definitions
3. Qwen calls tools as needed (e.g., `query_asteroids` then `control_scene`)
4. Tool results for data queries execute server-side, results returned to Qwen
5. Scene control commands emitted as special SSE events: `{"type":"scene_command","action":"focus","id":"2024-BX1"}`
6. Client intercepts scene commands, dispatches to Zustand store
7. Qwen streams natural language explanation alongside

### Agent Path — `/api/agent`

- **Model:** Claude via Anthropic Agent SDK
- **Purpose:** Autonomous analyst that monitors, reasons, and publishes
- **Schedule:** Every 4 hours via Vercel Cron
- **Memory:** Vercel KV with structured keys and TTLs
- **Replaces:** Current threshold-based `/api/monitoring` cron

**Agent loop (per execution):**
1. **FETCH** — Pull latest NASA NEO data, run rule-based enrichment
2. **RECALL** — Load agent memory from Vercel KV (past observations, tracked objects, trend history, rolling 30-day summary)
3. **ANALYZE** — Send data + memory to Claude via Agent SDK. Prompt: "Compare current NEO data against your previous observations. Identify new objects, orbital revisions, anomalous velocities/sizes, objects crossing alert thresholds, emerging trends."
4. **DECIDE** — Claude calls tools based on its analysis (SDK manages the agentic loop)
5. **PERSIST** — Save updated memory to KV

**Tools (Agent SDK tool definitions):**

| Tool | Purpose | Params |
|------|---------|--------|
| `save_observation` | Record what the agent noticed | object_id, observation_type (new_object, revision, anomaly, trend), details, severity |
| `annotate_scene` | Write a 3D annotation for the dashboard | object_id, label, severity, explanation, priority |
| `publish_threat` | Create a threat assessment page | object_id, title, analysis (markdown), risk_level, comparison_objects[] |
| `update_briefing` | Generate/update the daily briefing | summary, highlights[], watchlist[], stats |
| `send_alert` | Email notification for critical events | subject, body (markdown), urgency |
| `compare_historical` | Query past observations | object_id or query string |

**KV key structure:**

| Key | Content | TTL |
|-----|---------|-----|
| `agent:observations:{date}` | Array of observations from that run | 90 days |
| `agent:watchlist` | Objects being tracked, with reasons | No expiry (agent manages) |
| `agent:annotations` | Current scene annotations | 48 hours (refreshed each run) |
| `agent:briefing:latest` | Most recent daily briefing | No expiry (overwritten) |
| `agent:briefing:{date}` | Archived briefings | 30 days |
| `agent:threats:{object_id}` | Published threat assessments | No expiry |
| `agent:memory:summary` | Rolling 30-day condensed context | No expiry (overwritten) |

### Shared Data Layer

Both AI paths read from the same sources:
- NASA NEO API (fetched and cached by `/api/asteroids`)
- Rule-based risk scoring in `lib/nasa-api.ts` (deterministic core, unchanged)
- Vercel KV for agent outputs (chat reads via `get_agent_insights`, agent writes)

### New Pages

| Route | Content | Source |
|-------|---------|--------|
| `/briefings` | Daily AI-generated NEO briefing | Agent via `update_briefing` tool |
| `/threats/[id]` | Detailed threat assessment page | Agent via `publish_threat` tool |

## Visual Upgrade

Five layers applied to the existing EnhancedSolarSystem component.

### Layer 1: Post-Processing Pipeline

Using `@react-three/postprocessing` (already installed, currently unused).

| Effect | Purpose | Notes |
|--------|---------|-------|
| Bloom | Sun corona bleed, star halos, risk glow on asteroids | Selective bloom via layers |
| Tone Mapping | ACES Filmic for cinematic HDR | Bright sun doesn't wash out dark space |
| Vignette | Edge darkening for cinematic framing | Subtle (darkness ~0.5) |
| Chromatic Aberration | Photographic realism at edges | Very subtle (0.002), disabled on mobile |
| God Rays | Volumetric sun light | Visible when Sun partially occluded |

### Layer 2: Procedural Asteroid Geometry

Replace colored spheres with procedurally deformed meshes.

- **Base geometry:** IcosahedronGeometry with Simplex noise displacement for irregular rocky shapes
- **Material:** Custom PBR shader with roughness variation, subtle color banding (S-type brownish, C-type dark gray, M-type metallic)
- **LOD:** 3 levels — high detail (selected), medium (nearby), low/billboard (distant)
- **Risk indicator:** Emissive glow ring around asteroid, not sphere color. Ring color = risk level.

### Layer 3: Particle Effects

All GPU-instanced via InstancedBufferGeometry.

- **Solar wind:** Thousands of points streaming outward from Sun with velocity falloff
- **Asteroid trails:** Fading trail behind each asteroid proportional to velocity. High-risk = brighter trail.
- **Dust/debris:** Sparse micro-particles around asteroid belt region for depth and scale

### Layer 4: Cinematic Camera

- **Close approach mode:** When an asteroid is selected, camera transitions to a tracking shot following the asteroid past Earth. Depth of field blur on background.
- **AI Director mode:** Chat AI choreographs camera movements via `control_scene` tool. Camera paths defined as tool output parameters (target, angle, duration, easing).
- **Smooth transitions:** All camera moves use damped spring interpolation via existing Drei controls.

### Layer 5: AI Scene Annotations

- **Renderer:** Three.js CSS2DRenderer for HTML overlays anchored to world-space positions
- **Data source:** Agent writes structured annotation data to `agent:annotations` in KV
- **Content:** Risk label, severity badge, explanation text, connector line to object
- **Update cadence:** Refreshed when agent runs (every 4 hours), not per frame — zero render cost
- **Badge:** "Annotations by Claude Agent • Updated Xh ago" footer in scene

## TensorFlow.js Removal

### Remove

- `lib/ml/` (entire directory: risk-predictor.ts, feature-engineering.ts, browser-trainer.ts, data-generator.ts, model-trainer.ts)
- `lib/advanced-ml.ts`
- `hooks/useMLPredictions.ts`
- `public/models/` (TF.js model weights)
- `public/workers/` (ML web workers)
- `app/test-ml/` (test page)
- `scripts/train-model.js`
- `tsconfig.build.json` (ML build config)

### Uninstall packages

`@tensorflow/tfjs`, `@tensorflow/tfjs-node`, `ml-matrix`, `simple-statistics`

### Keep

- Rule-based risk scoring in `lib/nasa-api.ts` — deterministic core used by both AI paths
- Components referencing ML (MLIndicator, MLModelStats) — repurpose as Agent status indicators

### Remove npm scripts

- `ml:build`, `ml:train` — no longer needed

## Chat UI

- **Trigger:** Floating action button (bottom-right), expands to slide-out panel
- **Panel:** 45% width on desktop, full-screen sheet on mobile. Glassmorphism (backdrop-blur, semi-transparent background) matching space theme.
- **Messages:** User bubbles right-aligned (purple tint), AI bubbles left-aligned (neutral). Agent insight badges inline when the AI surfaces agent findings.
- **Tool call display:** When the AI calls a tool, show a compact monospace badge (e.g., `→ control_scene: focus("2024-BX1")`). Collapsible.
- **Streaming:** Tokens render incrementally. Scene commands execute immediately when received (don't wait for full response).
- **Input:** Text input with send button. Placeholder: "Ask about asteroids..."

## Environment Variables (New)

| Variable | Purpose | Required |
|----------|---------|----------|
| `OLLAMA_CLOUD_API_KEY` | Ollama Cloud API key for Qwen chat | Yes |
| `OLLAMA_CLOUD_BASE_URL` | Ollama Cloud API endpoint | Yes |
| `ANTHROPIC_API_KEY` | Claude API key for autonomous agent | Yes |
| `KV_REST_API_URL` | Vercel KV connection URL | Yes |
| `KV_REST_API_TOKEN` | Vercel KV auth token | Yes |

## Dependencies (New)

| Package | Purpose |
|---------|---------|
| `@anthropic-ai/sdk` | Claude API client (also used by Agent SDK) |
| Anthropic Agent SDK | Autonomous agent orchestration (verify exact npm package name at implementation time) |
| `@vercel/kv` | Vercel KV client for agent memory |

Dependencies already installed but underused: `@react-three/postprocessing` (used in Phase 2).

## Delivery Phases

Each phase is independently demoable. No hard timeline — ship incrementally.

### Phase 1: Clean Foundation
- Remove TensorFlow.js and all ML code
- Clean up ML-referencing components
- Remove unused dependencies, reduce bundle size
- Verify existing functionality works without ML layer

### Phase 2: Cinematic Visuals
- Post-processing pipeline (bloom, tone mapping, vignette, god rays)
- Procedural asteroid geometry with LOD
- Particle effects (solar wind, trails, debris)
- Cinematic camera system (close approach tracking, depth of field)
- Performance profiling and mobile fallbacks

### Phase 3: Chat Assistant
- Ollama Cloud API integration (`/api/chat` route with SSE streaming, OpenAI-compatible format)
- Chat UI panel (slide-out, streaming responses, glassmorphism)
- Tool definitions (query_asteroids, control_scene, get_statistics, get_agent_insights)
- Scene command protocol (SSE events → Zustand dispatch)
- System prompt with asteroid context injection
- Note: `get_agent_insights` returns empty defaults until Phase 4 sets up KV

### Phase 4: Autonomous Agent
- Anthropic Agent SDK integration (`/api/agent` route)
- Vercel KV setup for agent memory
- Agent tool definitions (observe, annotate, publish, brief, alert, compare)
- Replace current `/api/monitoring` cron with agent (4-hour schedule)
- `/briefings` and `/threats/[id]` pages

### Phase 5: AI Scene Annotations + Integration
- CSS2DRenderer overlay system for 3D annotations
- Agent annotations rendered in scene from KV data
- Chat `get_agent_insights` tool bridges both AI systems
- AI Director camera mode (chat controls cinematic camera sequences)
- Agent status indicator in dashboard (replaces ML indicator)
- Polish, end-to-end testing, mobile responsiveness
