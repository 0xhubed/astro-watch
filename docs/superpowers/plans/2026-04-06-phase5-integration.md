# Phase 5: AI Scene Annotations + Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the two AI systems (chat + autonomous agent), add scene annotations from the agent, and add an agent status indicator. This is the final integration phase.

**Architecture:** The chat assistant gets a `get_agent_insights` tool to read agent findings from KV. The 3D scene renders agent annotations as HTML overlays. A status indicator replaces the removed ML indicator.

**Tech Stack:** React Three Fiber (Html from drei), Vercel KV reads, Zustand.

---

### File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `lib/chat/tools.ts` | Add get_agent_insights tool definition + execution |
| Create | `components/visualization/3d/AgentAnnotations.tsx` | Render agent annotations as HTML overlays in 3D scene |
| Create | `components/dashboard/AgentStatusIndicator.tsx` | Shows agent last-run status in dashboard |
| Create | `app/api/agent-data/route.ts` | API route to fetch agent annotations and briefing for client |
| Modify | `components/visualization/3d/EnhancedSolarSystem.tsx` | Add AgentAnnotations to scene |
| Modify | `app/dashboard/page.tsx` | Add AgentStatusIndicator |

---

### Task 1: Add get_agent_insights to Chat Tools

**Files:**
- Modify: `astro-watch/lib/chat/tools.ts`

Add a 4th tool definition to `chatTools` array and its execution in the chat API route.

The tool reads from agent memory (loadBriefing, loadAnnotationsPublic from `@/lib/agent/memory`).

### Task 2: Agent Data API Route

**Files:**
- Create: `astro-watch/app/api/agent-data/route.ts`

Client-side components can't call KV directly. This route returns the latest annotations and briefing summary for the dashboard.

### Task 3: Agent Annotations in 3D Scene

**Files:**
- Create: `astro-watch/components/visualization/3d/AgentAnnotations.tsx`
- Modify: `astro-watch/components/visualization/3d/EnhancedSolarSystem.tsx`

Uses `Html` from `@react-three/drei` to render floating labels anchored to asteroid positions.

### Task 4: Agent Status Indicator + Final Polish

**Files:**
- Create: `astro-watch/components/dashboard/AgentStatusIndicator.tsx`
- Modify: `astro-watch/app/dashboard/page.tsx`

### Task 5: Build Verification
