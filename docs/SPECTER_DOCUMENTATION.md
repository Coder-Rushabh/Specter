# Specter — Technical Documentation

> **Version:** 1.0  
> **Last Updated:** May 2026  
> **Author:** Rushabh Dabhade  
> **Status:** Production

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Environment Variables](#5-environment-variables)
6. [Database Schema](#6-database-schema)
7. [Engine: Core Components](#7-engine-core-components)
   - [Orchestrator](#71-orchestrator)
   - [Browser Service](#72-browser-service)
   - [LLM Service](#73-llm-service)
   - [SiteMap](#74-sitemap)
   - [Reporter](#75-reporter)
   - [Semaphore](#76-semaphore)
8. [Scoring System](#8-scoring-system)
9. [Persona System](#9-persona-system)
10. [Multi-LLM Architecture](#10-multi-llm-architecture)
11. [Realtime System](#11-realtime-system)
12. [API Routes](#12-api-routes)
13. [Server Actions](#13-server-actions)
14. [Security](#14-security)
15. [Frontend Components](#15-frontend-components)
16. [Data Flows](#16-data-flows)
17. [Deployment](#17-deployment)
18. [Operational Limits & Constraints](#18-operational-limits--constraints)
19. [Type Reference](#19-type-reference)
20. [Known Limitations & Roadmap](#20-known-limitations--roadmap)

---

## 1. Overview

Specter is an **autonomous synthetic user testing platform**. It replaces manual UX research by deploying AI-driven personas that browse web applications like real users — navigating pages, evaluating layout, forming emotional reactions, and generating structured UX reports — in minutes instead of weeks.

### Core Value Proposition

| Traditional UX Research | Specter |
|---|---|
| Recruit participants (weeks) | Launch in minutes |
| 5–10 real users | 5–50 synthetic personas, parallel |
| Transcription + analysis (days) | AI report auto-generated |
| $5K–$50K per study | Subscription or pay-per-run |
| Observer effect & bias | Objective, reproducible |
| Point-in-time snapshots | Re-run after every deploy |

### Key Differentiators

- **Multi-LLM:** Works with Gemini (free tier default), OpenRouter (100+ models), or local Ollama — not locked to a single provider.
- **Vision-native:** Personas see actual screenshots, not HTML source. They evaluate visual hierarchy, layout quality, trust signals, and content clarity.
- **Emotional scoring:** Every page section receives an emotion tag (frustration, delight, confusion, etc.) and intensity score, feeding a calibrated UX Health Score (0–100).
- **Real-time execution:** Watch any persona browse your site live — screenshots, inner monologue, and navigation history update in real time.
- **Hallucination prevention:** LLM-suggested next URLs are validated against DOM-harvested links before queuing — zero phantom page visits.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS APP (App Router)                     │
│  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────────┐  │
│  │  Marketing Pages │  │ Dashboard (Auth'd) │  │    API Routes    │  │
│  │  /               │  │ /dashboard         │  │ /api/health      │  │
│  │  /pricing        │  │ /projects          │  │ /api/reports/... │  │
│  │  /product        │  │ /test-runs         │  │ /api/sessions/.. │  │
│  └──────────────────┘  │ /reports           │  │ /api/webhooks/.. │  │
│                         │ /sessions          │  └──────────────────┘  │
│                         └───────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                        Server Actions / API calls
                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                           ENGINE LAYER                               │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                      ORCHESTRATOR                            │    │
│  │  • Manages session state machine                             │    │
│  │  • Coordinates Browser ↔ LLM                                │    │
│  │  • Buffered DB writes (every 3 steps)                        │    │
│  │  • Broadcasts diagnostics via Supabase Realtime              │    │
│  │  • Browser restart logic (max 3 per crawl)                   │    │
│  └────────────────┬────────────────────────┬────────────────────┘    │
│                   │                        │                         │
│  ┌────────────────▼──────┐  ┌─────────────▼──────────────────┐      │
│  │   BROWSER SERVICE     │  │       LLM SERVICE               │      │
│  │   (Stagehand +        │  │   ┌──────────────────────────┐  │      │
│  │    Playwright)        │  │   │ GeminiProvider           │  │      │
│  │                       │  │   │ OpenAIProvider           │  │      │
│  │  • Navigate           │  │   │ OpenRouterProvider       │  │      │
│  │  • N-slice screenshot │  │   │ OllamaProvider           │  │      │
│  │  • DOM extraction     │  │   └──────────────────────────┘  │      │
│  │  • Popup dismissal    │  │                                  │      │
│  │  • Heuristic clicks   │  │  • analysePage()                 │      │
│  │  • Link harvesting    │  │  • analyzePageSections()         │      │
│  │  • Network monitoring │  │  • generatePersonas()            │      │
│  │  • Cookie portability │  │  • suggestArchetypes()           │      │
│  └───────────────────────┘  └──────────────────────────────────┘      │
│                                                                      │
│  ┌─────────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │      SITEMAP        │  │    REPORTER     │  │   SEMAPHORE     │  │
│  │  Priority queue     │  │  Post-run       │  │  Browser        │  │
│  │  URL dedup          │  │  synthesis      │  │  concurrency    │  │
│  │  Content limiting   │  │  Action items   │  │  control        │  │
│  └─────────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                 │
│                                                                      │
│  ┌──────────────────────────────────┐  ┌───────────────────────────┐│
│  │        SUPABASE                  │  │     SUPABASE STORAGE      ││
│  │  PostgreSQL + Realtime           │  │  Screenshots (JPEG)       ││
│  │  Row Level Security              │  │  Public CDN URLs          ││
│  │  Clerk JWT integration           │  └───────────────────────────┘│
│  └──────────────────────────────────┘                                │
└─────────────────────────────────────────────────────────────────────┘
```

### Request Flow (Session Launch)

```
User clicks "Confirm Cohort & Launch"
        │
        ▼
createTestRun() [Server Action]
        │
        ├── Upsert project in Supabase
        ├── Create test_run record
        └── For each persona:
             ├── Insert persona_config
             ├── Insert persona_session (status: 'queued')
             └── orchestrator.runSession() ← fire-and-forget
                      │
                      ▼
             redirect to /test-runs/{id}
                      │
                      ▼
             Live session page subscribes to:
               • Supabase Realtime: session/{id} changes
               • Supabase Realtime: logs/{id} inserts
               • Supabase Broadcast: terminal_{id} messages
```

---

## 3. Technology Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Next.js | 16.1.6 | App Router, TypeScript |
| Runtime | Node.js | — | Server Actions run server-side |
| Auth | Clerk | ^7.0.1 | JWT-based, synced to Supabase via JIT |
| Database | Supabase | ^2.98.0 | PostgreSQL + Realtime + Storage |
| Browser Automation | Stagehand (`@browserbasehq/stagehand`) | ^3.1.0 | Playwright wrapper with AI-assisted actions |
| Browser (remote) | BrowserBase | — | Optional; local Chromium used if not set |
| LLM — Default | Google Gemini 2.0 Flash | `@google/generative-ai ^0.24.1` | Free, default |
| LLM — OpenAI | GPT-4o / GPT-4o-mini | `openai ^6.27.0` | Vision + structured output |
| LLM — OpenRouter | 100+ models | `openai` (base URL override) | Unified gateway |
| LLM — Local | Ollama (llama3.2-vision etc.) | native REST | Private, no API key |
| Styling | Tailwind CSS | ^4 | Utility-first |
| Animations | Framer Motion | ^12.38.0 | Marketing pages |
| 3D | Three.js + React Three Fiber | ^0.183 / ^9.5 | Lego model on landing page |
| Charts | Recharts | ^3.8.0 | Emotion breakdowns in reports |
| PDF Export | html2canvas + jsPDF | ^1.4.1 / ^4.2.1 | Client-side report export |
| Schema Validation | Zod | ^4.3.6 | LLM output validation |
| Deployment | Railway | — | Docker-based via `Dockerfile` |
| Package Manager | pnpm | — | |

---

## 4. Project Structure

```
Specter/
├── src/
│   ├── app/
│   │   ├── (dashboard)/              # Auth-protected route group
│   │   │   ├── layout.tsx            # Dashboard shell (sidebar, auth gate)
│   │   │   ├── loading.tsx           # Shared loading state
│   │   │   ├── dashboard/page.tsx    # Overview stats
│   │   │   ├── personas/page.tsx     # Persona library
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx          # All projects list
│   │   │   │   ├── [projectId]/
│   │   │   │   │   ├── page.tsx      # Project detail
│   │   │   │   │   └── setup/page.tsx # Test setup wizard
│   │   │   │   └── actions.ts        # createTestRun, suggestArchetypes, generatePersonas
│   │   │   ├── test-runs/
│   │   │   │   ├── page.tsx          # All test runs
│   │   │   │   ├── [runId]/page.tsx  # Live run view (real-time sessions)
│   │   │   │   └── actions.ts        # rerunTestRun, stopTestRun
│   │   │   ├── reports/
│   │   │   │   ├── page.tsx          # Reports list
│   │   │   │   └── [testRunId]/page.tsx # Full report view
│   │   │   └── sessions/
│   │   │       └── [sessionId]/page.tsx # Individual session view
│   │   ├── (marketing)/              # Public route group
│   │   │   ├── layout.tsx            # Marketing navbar
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── about/page.tsx
│   │   │   ├── pricing/page.tsx
│   │   │   ├── product/page.tsx
│   │   │   └── docs/page.tsx
│   │   ├── actions/
│   │   │   ├── reports.ts            # Report fetch/PDF export actions
│   │   │   └── user.ts               # User sync action
│   │   ├── api/
│   │   │   ├── health/route.ts       # GET /api/health — uptime check
│   │   │   ├── jobs/enqueue/route.ts # POST — stub (not implemented)
│   │   │   ├── reports/[testRunId]/route.ts # GET report data
│   │   │   ├── sessions/[sessionId]/step/route.ts # POST — manual mode step signal
│   │   │   └── webhooks/stripe/route.ts # POST — Stripe webhook handler
│   │   ├── sign-in/[[...sign-in]]/   # Clerk catch-all sign-in
│   │   ├── sign-up/[[...sign-up]]/   # Clerk catch-all sign-up
│   │   ├── globals.css
│   │   └── layout.tsx                # Root layout (ClerkProvider, fonts)
│   ├── components/
│   │   ├── auth/
│   │   │   ├── SyncUser.tsx          # JIT user sync to Supabase on mount
│   │   │   └── UserMenu.tsx          # Avatar + sign out
│   │   ├── dashboard/
│   │   │   └── Sidebar.tsx           # Navigation sidebar
│   │   ├── engine/
│   │   │   ├── LiveDashboardStats.tsx # Realtime session counters
│   │   │   ├── LiveSessionList.tsx   # Active sessions with status
│   │   │   ├── RerunButton.tsx       # Trigger rerun action
│   │   │   ├── SessionControl.tsx    # Manual mode next-step controls
│   │   │   ├── SessionLogAccordion.tsx # Expandable step log
│   │   │   └── StopButton.tsx        # Stop all sessions
│   │   ├── forms/
│   │   │   └── ProjectUrlForm.tsx    # URL input + validation
│   │   ├── marketing/
│   │   │   ├── CtaSection.tsx
│   │   │   ├── LegoModelSection.tsx  # Three.js 3D model
│   │   │   ├── LegoModelWrapper.tsx  # SSR-safe dynamic import
│   │   │   ├── MarketingNavbar.tsx
│   │   │   ├── NavLinks.tsx
│   │   │   ├── ReportInsightSection.tsx
│   │   │   ├── ScrollyHero.tsx       # Scroll-driven hero animation
│   │   │   └── UrlTypewriterSection.tsx
│   │   ├── reports/
│   │   │   ├── ActionItems.tsx       # Prioritized fix list
│   │   │   ├── AuditTrail.tsx        # Per-step history table
│   │   │   ├── ClickHeatmap.tsx      # Coordinate overlay on screenshot
│   │   │   ├── FeedbackSummary.tsx   # AI-generated feedback prose
│   │   │   ├── HeatmapOverlay.tsx    # Canvas heatmap renderer
│   │   │   ├── MetricTooltip.tsx     # Score explanation tooltip
│   │   │   ├── RefreshButton.tsx     # Force-refresh report
│   │   │   ├── ReportActions.tsx     # Share/export controls
│   │   │   ├── ReportCard.tsx        # Report summary card
│   │   │   ├── ReportsList.tsx       # Reports index list
│   │   │   ├── ScrollToTop.tsx       # Floating scroll button
│   │   │   ├── SentimentTimeline.tsx # Emotion over time chart
│   │   │   ├── StepFeedbackCard.tsx  # Individual step with screenshot
│   │   │   ├── TechnicalAudit.tsx    # Broken links, slow pages
│   │   │   └── WebsiteHeatmap.tsx    # Heatmap wrapper
│   │   ├── test-runs/
│   │   │   └── TestRunsList.tsx      # Test runs index table
│   │   └── ui/
│   │       ├── background-beams-with-collision.tsx
│   │       ├── button.tsx
│   │       └── google-gemini-effect.tsx
│   ├── lib/
│   │   ├── constants.ts              # App-wide constants
│   │   ├── constants/personas.ts     # SAMPLE_PERSONAS library
│   │   ├── engine/
│   │   │   ├── browser.ts            # BrowserService (Stagehand wrapper)
│   │   │   ├── llm.ts                # LLMService + providers
│   │   │   ├── orchestrator.ts       # Session state machine
│   │   │   ├── reporter.ts           # Post-run report generation
│   │   │   ├── semaphore.ts          # Browser concurrency control
│   │   │   ├── sitemap.ts            # Priority queue for crawl
│   │   │   └── types.ts              # Shared TypeScript interfaces
│   │   ├── supabase/
│   │   │   ├── admin.ts              # Service-role client (bypass RLS)
│   │   │   ├── client.ts             # Browser-side anon client
│   │   │   └── server.ts             # Server-side anon client (cookies)
│   │   ├── types.ts                  # Global app types
│   │   └── utils/
│   │       ├── scoring.ts            # UX score calculation
│   │       ├── vault.ts              # AES-256-CBC encrypt/decrypt
│   │       └── (utils.ts)            # cn() helper
│   ├── server/
│   │   ├── db/queries.ts             # Reusable DB query helpers
│   │   ├── engine/
│   │   │   ├── dom-parser.ts         # DOM parsing utilities
│   │   │   └── playwright-manager.ts # Browser lifecycle (alt)
│   │   ├── llm/
│   │   │   ├── client.ts             # LLM client wrappers
│   │   │   └── prompts.ts            # Prompt templates
│   │   └── workers/
│   │       ├── aggregator.ts         # Score aggregation worker
│   │       └── persona-worker.ts     # Individual persona executor
│   └── proxy.ts                      # Next.js 16 middleware (renamed from middleware.ts)
├── supabase/migrations/              # Ordered SQL migration files
├── docs/                             # Architecture documentation
├── public/                           # Static assets
│   ├── screenshots/                  # Local dev screenshot storage
│   └── lego_man_pilot/              # 3D model assets
├── Dockerfile                        # Railway deployment
├── railway.toml                      # Railway config
├── .env.example
└── package.json
```

---

## 5. Environment Variables

All variables must be set in `.env.local` (development) or Railway environment (production).

### Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=            # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # Anon (public) key
SUPABASE_SERVICE_ROLE_KEY=           # Service role key (bypasses RLS — server-only)
SUPABASE_SCREENSHOTS_BUCKET=         # Storage bucket name for screenshots

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=   # Public key (included in client bundle)
CLERK_SECRET_KEY=                    # Server-only secret

# LLM
GEMINI_API_KEY=                      # Always required — Stagehand uses this for browser automation

# Encryption
ENCRYPTION_KEY=                      # Any secret string; used to derive AES-256 key for API key storage
```

### Optional

```bash
# Additional LLM providers
OPENAI_API_KEY=                      # Optional; overridden by per-project key

# Cloud browser (BrowserBase)
BROWSERBASE_API_KEY=                 # If not set, local Chromium is used
BROWSERBASE_PROJECT_ID=

# Local LLM
OLLAMA_HOST=http://localhost:11434   # Default
OLLAMA_MODELS=llama3.2-vision        # Comma-separated model list

# Concurrency
MAX_CONCURRENT_BROWSERS=5           # Default: 2 (local), 5 (Browserbase)

# Stripe (billing)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### Variable Hierarchy

```
GEMINI_API_KEY (env)  ←  Always used for browser automation (Stagehand)
project.encrypted_llm_key (DB)  ←  Used for reasoning/analysis LLM calls
                                    (decrypted at session start)
```

---

## 6. Database Schema

**Technology:** Supabase PostgreSQL  
**Auth integration:** Clerk JWTs via `auth.jwt() ->> 'sub'` = Clerk user ID  
**RLS:** Enabled on all tables — service role bypasses for engine writes

### Entity Relationship

```
users
 └── projects (unique: user_id + target_url)
      └── test_runs
           ├── persona_sessions
           │    └── session_logs
           └── reports

persona_configs ──→ persona_sessions
                    (library personas have project_id = NULL)

ai_caches (global, not user-scoped)
```

### Enums

| Enum | Values |
|---|---|
| `plan_tier` | `free`, `pro`, `team` |
| `tech_literacy` | `low`, `medium`, `high` |
| `test_run_status` | `pending`, `running`, `completed`, `failed`, `stopped` |
| `session_status` | `queued`, `running`, `completed`, `abandoned`, `error` |
| `emotion_tag` | `neutral`, `confusion`, `frustration`, `delight`, `satisfaction`, `curiosity`, `surprise`, `boredom`, `disappointment` |

### Table: `users`

Synced from Clerk on first action (JIT sync via service role).

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` PK | Clerk user ID (`user_xxx`) |
| `email` | `TEXT` UNIQUE | |
| `name` | `TEXT` | |
| `plan_tier` | `plan_tier` | Default `free` |
| `stripe_customer_id` | `TEXT` | Set on Stripe customer creation |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | |

### Table: `projects`

One project = one target URL + LLM config. Unique per (user, URL).

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `user_id` | `TEXT` FK → `users.id` | |
| `name` | `TEXT` | Auto-derived from URL hostname |
| `target_url` | `TEXT` | URL under test |
| `requires_auth` | `BOOLEAN` | |
| `auth_credentials` | `TEXT` | Encrypted JSON |
| `llm_provider` | `TEXT` | `gemini` \| `openai` \| `openrouter` \| `ollama` |
| `llm_model_name` | `TEXT` | OpenRouter model ID |
| `encrypted_llm_key` | `TEXT` | AES-256-CBC encrypted key (`iv:ciphertext`) |
| `save_llm_key` | `BOOLEAN` | Whether key was persisted |

### Table: `test_runs`

One run = one full cohort execution against a project.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `project_id` | `UUID` FK | |
| `status` | `test_run_status` | |
| `started_at` / `completed_at` / `created_at` | `TIMESTAMPTZ` | |

### Table: `persona_configs`

Persona template. Can be project-scoped or library (no project).

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `project_id` | `UUID` FK | Nullable for library |
| `user_id` | `TEXT` FK | |
| `name` | `TEXT` | Role name e.g. "Budget Traveler" |
| `age_range` | `TEXT` | e.g. `25-34` |
| `geolocation` | `TEXT` | |
| `tech_literacy` | `tech_literacy` | |
| `goal_prompt` | `TEXT` | Behavioral directive for the LLM |
| `domain_familiarity` | `TEXT` | |
| `persona_count` | `INTEGER` | Parallel instances to spawn |
| `ai_system_prompt` | `TEXT` | Expanded profile (LLM-generated) |

### Table: `persona_sessions`

One row per persona instance running through the site.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `test_run_id` | `UUID` FK | |
| `persona_config_id` | `UUID` FK | |
| `status` | `session_status` | |
| `exit_reason` | `TEXT` | Why it ended |
| `execution_mode` | `TEXT` | `autonomous` \| `manual` |
| `is_paused` | `BOOLEAN` | Manual mode pause state |
| `step_requested` | `BOOLEAN` | Manual mode step trigger |
| `live_status` | `TEXT` | Realtime status string for UI |
| `started_at` / `completed_at` / `created_at` | `TIMESTAMPTZ` | |

> **Realtime:** This table is included in the `supabase_realtime` publication. Frontend subscribes to `postgres_changes` on this table for live status updates.

### Table: `session_logs`

One row per page section analyzed. The primary record of what the persona saw and felt.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `session_id` | `UUID` FK | |
| `step_number` | `INTEGER` | Ordered within session |
| `current_url` | `TEXT` | |
| `screenshot_url` | `TEXT` | Supabase Storage URL or local path |
| `emotion_tag` | `emotion_tag` | |
| `emotion_score` | `INTEGER` | 1–10 |
| `inner_monologue` | `TEXT` | UX feedback text |
| `action_taken` | `JSONB` | See below |
| `created_at` | `TIMESTAMPTZ` | |

**`action_taken` JSONB Shapes:**

```jsonc
// System lifecycle event
{ "type": "system", "info": "session_started | session_completed | session_retry | browser_session_renewed" }

// Per-slice page section analysis (most common)
{
  "type": "page_section",
  "info": "section_Slice-1",
  "label": "Slice-1",
  "proposed_solution": "...",
  "specific_emotion": "curious",
  "local_screenshot_path": "/screenshots/{sessionId}/step_4.jpg",
  // On the LAST section of each page only:
  "page_summary": "...",
  "friction_points": ["..."],
  "positives": ["..."],
  "overall_emotion": "curiosity",
  "overall_intensity": 0.72,
  "technical_metrics": { "latency_ms": 1240, "broken_links_count": 0, "request_failures": 0 }
}

// Heuristic click (no LLM)
{
  "type": "click",
  "info": "heuristic_interaction",
  "text": "Get Started",
  "coordinates": { "x": 120, "y": 340, "w": 80, "h": 32 },
  "navigated_to": "https://example.com/signup | null"
}
```

### Table: `reports`

One report per test run. Generated after all sessions complete.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `test_run_id` | `UUID` UNIQUE FK | |
| `product_opportunity_score` | `INTEGER` | 0–100 |
| `executive_summary` | `TEXT` | LLM-generated Markdown |
| `funnel_completion_rate` | `DECIMAL(5,2)` | % sessions reaching goal |
| `heatmap_data_url` | `TEXT` | Reserved (not yet generated) |
| `report_data` | `JSONB` | Pre-aggregated data for frontend |

**`report_data` JSONB Shape:**

```jsonc
{
  "emotionStats": { "delight": 12, "confusion": 8, ... },
  "sessionScores": [78, 65, 82, ...],
  "actionItems": [
    { "priority": "High", "title": "Fix CTA visibility", "detail": "...", "stepRefs": [...] }
  ],
  "feedbackSummary": "2-3 sentence AI summary of recurring themes",
  "totalFeedbackPoints": 47,
  "dropOffStats": { "https://example.com/pricing": 2 },
  "technicalAudit": {
    "brokenLinks": [{ "url": "...", "error": "1 broken link(s)" }],
    "slowPages": [{ "url": "...", "latency": 4200 }],
    "frictionPoints": []
  }
}
```

### Table: `ai_caches`

Global (not user-scoped) cache for expensive LLM calls.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | |
| `cache_key` | `TEXT` UNIQUE | `archetypes:{url}` or `personas:{url}` |
| `payload` | `JSONB` | Cached LLM response |
| `cache_type` | `TEXT` | `archetypes` \| `personas` |
| `created_at` | `TIMESTAMPTZ` | |

> Any authenticated user can read/insert — cache is global. Entries for the same URL are overwritten on regenerate (upsert).

---

## 7. Engine: Core Components

### 7.1 Orchestrator

**File:** [src/lib/engine/orchestrator.ts](../src/lib/engine/orchestrator.ts)

The orchestrator is the top-level controller for a persona session. It owns the session state machine, coordinates Browser ↔ LLM, writes logs to Supabase, and handles crashes and restarts.

#### Constants

```typescript
MAX_PAGES = 10             // Hard cap on unique pages visited
DB_FLUSH_INTERVAL = 3      // Flush log buffer every N steps
LINK_HARVEST_MAX = 20      // Max links collected per page
MAX_BROWSER_RESTARTS = 3   // Max BrowserBase session renewals per crawl
MAX_INTERACTIONS = 4       // Max heuristic clicks per page
MAX_RETRIES = 2            // Session-level retry on non-config errors
```

#### Session Lifecycle

```
runSession()
    │
    ├── Fetch session data from DB (persona config, project LLM config)
    ├── Decrypt API key (vault.decrypt)
    ├── Initialize LLMService
    ├── Set session status → 'running'
    ├── acquireBrowser() [semaphore]
    ├── browser.init() [Stagehand + Gemini Flash]
    └── runCrawl()
         │
         └── while (visitedCount < MAX_PAGES && queue not empty):
              │
              ├── Check session not abandoned
              ├── PHASE 1: BROWSER
              │    ├── browser.navigate(url)
              │    ├── browser.getLastPageMetrics()
              │    ├── browser.exportCookies() [checkpoint]
              │    ├── browser.observeFastPage() [N-slice capture]
              │    ├── browser.getContentLinks() [link harvest]
              │    ├── runInteractions() [heuristic clicks]
              │    └── browser.fingerprintHeaderFooter()
              │
              └── PHASE 2: LLM
                   ├── Filter sections (header/footer dedup)
                   ├── llm.analysePage() or llm.analyzePageSections() (auth)
                   ├── Log one DB entry per section
                   ├── Validate next_links against harvested links
                   └── siteMap.enqueue(validLinks + harvestedLinks)
         │
         ├── flushLogs()
         ├── Set session status → 'completed'
         └── checkAndFinalizeTestRun()
```

#### Browser Restart Logic

BrowserBase sessions expire after ~10 minutes. The orchestrator detects CDP-level errors and renews transparently:

1. Detect `isBrowserTimeoutError()` — matches 15+ error message patterns
2. Close the dead browser
3. Re-enqueue the current page (so it's not lost)
4. Call `browser.init()` again
5. Restore cookies from the last checkpoint (`lastGoodCookies`)
6. Continue crawl from where it left off
7. Max 3 restarts per crawl; if exceeded, mark session `completed` with partial data

#### Buffered Logging

Steps accumulate in `this.logBuffer` and are flushed to Supabase in batches:

```typescript
// Flush triggers:
// 1. Automatic: after every page (flushLogs() call)
// 2. Manual: session end, crash handler, browser restart
```

Reduces Supabase write operations by ~65% on long sessions (30+ steps).

#### Header/Footer Deduplication

```typescript
// After each page observation:
const { header: hFp, footer: fFp } = await browser.fingerprintHeaderFooter();
const headerSeen = hFp && this.seenHeaderFp.has(hFp);
// If seen, Slice-1 (header) and/or last slice (footer) are removed from LLM input.
// At least one slice is always kept.
```

This prevents the LLM from re-analyzing identical site-wide navigation on every page, reducing token usage and improving analysis focus.

---

### 7.2 Browser Service

**File:** [src/lib/engine/browser.ts](../src/lib/engine/browser.ts)

Wraps Stagehand (Playwright + AI) to provide reliable browser control with custom extensions.

#### Initialization

```typescript
await browser.init(modelName, apiKey);
// modelName: 'google/gemini-2.0-flash' (always — Stagehand requirement)
// apiKey: GEMINI_API_KEY

// Two modes:
// LOCAL: headless Chromium, launched by Playwright (for dev)
// BROWSERBASE: remote cloud browser via BrowserBase API (for production)
```

Chromium launch args (local mode):
```
--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage
--disable-gpu --disable-extensions --disable-plugins
--disable-background-networking --mute-audio --no-first-run
```

#### Navigation

```typescript
await browser.navigate(url);
```

Double `networkidle` strategy:
1. `goto(url)` with `domcontentloaded` timeout (60s)
2. `waitForLoadState('networkidle', 5s)` — initial resources
3. `waitForTimeout(600ms)` — React/Vue/Angular `useEffect` fires here
4. `waitForLoadState('networkidle', 6s)` — lazy API responses
5. `waitForContent(8s)` — poll for real visible text

#### Content Readiness Check

Polls every 300ms up to 8s, requiring ALL of:
1. `document.readyState === 'complete'`
2. `body.innerText.length > 100` (not a blank SPA shell)
3. No `[class*="skeleton"]`, `[class*="spinner"]`, `[aria-busy]`, `progress` elements visible
4. No API-pending placeholder text matching `/^(no .* found\.|loading\.\.\.|please wait|fetching|coming soon)/i`

Falls through silently on timeout — a slightly early screenshot is better than hanging.

#### Full-Page Capture (`observeFastPage`)

```typescript
const observation = await browser.observeFastPage();
// Returns: Observation with 1-5 sections
```

Strategy:
1. Scroll to top
2. Measure `pageHeight / viewportHeight`
3. `sliceCount = min(5, ceil(pageHeight / viewportHeight))`
4. For each slice: scroll, wait 80ms, capture JPEG (quality 45)
5. After Slice-1: run `dismissPopups()`
6. After all slices: scroll to top, run `extractDOMFast()`
7. Attach DOM to Slice-1's `domContext`

> **Note:** The product overview mentions 8 slices as the theoretical cap; the current code caps at 5 to keep the browser phase under ~10 seconds.

#### DOM Extraction (`extractDOMFast`)

Pure `page.evaluate()` — no Stagehand AI overhead:

```typescript
// Queries: a[href], button, input, select, textarea,
//          [role="button"], [role="link"], [role="checkbox"],
//          [role="radio"], [role="tab"], [role="menuitem"]
// Max 60 elements
// Deduplicates by role::text
// Includes absolute document coordinates for heatmap
// ~100-200ms vs 3-5s for stagehand.observe()
```

#### Popup Dismissal

Called after Slice-1 so the LLM still sees any popup as UX data:

1. `Escape` key press
2. Click first matching dismiss button from a 20+ selector list (GDPR, cookie banners, Intercom, generic modals)
3. Force-hide any remaining `position:fixed` overlay matching popup keyword patterns via JS injection

#### Heuristic Clicks

No LLM — pure Playwright. Returns up to 4 prioritized clickable elements:

```
Priority 10: CTAs matching /sign.?up|get.?start|try.?free|buy|pricing|demo|.../
Priority  8: <button> elements
Priority  7: Navigation links
Priority  4: Other links
```

Used to generate heatmap coordinate data. If a click navigates away, the destination is enqueued and the orchestrator returns to the current page.

#### Network Monitoring

Attached to the Playwright browser context (not Stagehand's wrapper):
- `response` events: captures 4xx/5xx responses as broken links
- `requestfailed` events: increments failure counter

`getLastPageMetrics()` returns per-page deltas using a snapshot taken at `navigate()` start.

#### Cookie Portability

```typescript
const cookies = await browser.exportCookies();  // checkpoint after each page
await browser.restoreCookies(cookies);            // restore after browser restart
```

Preserves authentication state across BrowserBase session renewals.

---

### 7.3 LLM Service

**File:** [src/lib/engine/llm.ts](../src/lib/engine/llm.ts)

Unified facade over four LLM backends with a common `LLMProvider` interface.

#### Provider Summary

| Provider | Class | Model | Vision | Token Budget | Notes |
|---|---|---|---|---|---|
| Gemini | `GeminiProvider` | `gemini-2.0-flash` | Yes | `responseMimeType: 'application/json'` | Free tier; retry on 429 |
| OpenAI | `OpenAIProvider` | `gpt-4o` (vision) / `gpt-4o-mini` (text) | Yes | Zod structured output | Structured response format |
| OpenRouter | `OpenRouterProvider` | User-configured | Yes (with fallback) | `json_object` | Retry on 429/400; vision fallback |
| Ollama | `OllamaProvider` | `llama3.2-vision` | Yes (first slice only) | 120s timeout | Local; REST API |

#### Key LLM Calls

**`analysePage()`** — Primary call for regular pages. One API call covers all slices.

Input:
- Up to 4 sampled section screenshots (representative coverage of 1–5 slices)
- Page URL + title
- Persona profile + tech literacy
- Available links from DOM (up to 25)
- Running journey narrative

Output:
```typescript
{
  sections: [{ label, ux_feedback, emotional_state, emotional_intensity, proposed_solution }],
  overall_emotion, overall_intensity,
  page_summary,
  friction_points: string[],    // concrete UX problems
  positives: string[],          // well-executed elements
  next_links: string[],         // 3-5 URLs to visit next
  journey_narrative_update: string  // one-sentence running diary
}
```

**`analyzePageSections()`** — Simpler call for auth pages. Same images, no navigation intent. No `next_links`, no `friction_points`.

**`generatePersonas()`** + **`suggestArchetypes()`** — Text-only calls (cheaper). Used in setup wizard. Results cached in `ai_caches`.

**`decideNextAction()`** — Legacy interactive agent call. Not used in current Crawl-Reason-Repeat engine; retained for future manual mode.

#### Section Sampling

To avoid token/rate-limit overloads when sending multiple images:

```typescript
const MAX_LLM_SECTIONS = 4;

function sampleSections(sections, max = 4):
  // Always includes first and last slice
  // Distributes middle samples evenly
  // Gemini back-fills skipped sections with neutral placeholders
```

#### Retry Strategies

**Gemini:** Start at 10s, double up to 60s, max 4 retries. Handles free-tier 15 RPM limit.

**OpenRouter:** 
- 429 rate limit: 15s, 30s, 60s (exponential)
- 400 provider error: 1s, 2s, 4s
- Model not found (404): fail immediately with descriptive error

**Gemini JSON repair:** Gemini occasionally emits literal control characters inside JSON strings. `safeParseGeminiJson()` sanitizes them before parsing.

**OpenRouter normalization:** `normalizeAction()` + `extractJson()` handle non-standard output from free models (prose, markdown fences, unquoted keys).

---

### 7.4 SiteMap

**File:** [src/lib/engine/sitemap.ts](../src/lib/engine/sitemap.ts)

Priority queue and visit tracker for the Crawl-Reason-Repeat loop.

#### URL Priority

```
/pricing, /plans, /buy, /purchase     → 10
/checkout, /cart, /payment            → 9
/features, /product, /overview, /tour → 8
/about, /company, /team               → 6
/docs, /guide, /help, /faq            → 5
/blog, /news, /articles               → 3
/changelog, /release                  → 2
(all others)                          → 5
```

Each URL gets ±0.9 random jitter within its tier so sibling pages don't always visit in the same order.

#### Queue Behavior

```
65% chance: dequeue highest-priority item
35% chance: pick any random item (prevents low-priority pages from starving)
```

#### Filters Applied at Enqueue

1. Must be same hostname (no external links)
2. Skip asset URLs (`.jpg`, `.css`, `.js`, `.pdf`, etc.)
3. Skip query params and fragments (canonical URLs only)
4. Skip already-visited URLs
5. Skip URLs already in queue (deduplicated)
6. Content pages (blog, docs): max 2 per URL pattern
7. Max queue depth: 50 items

#### URL Pattern Normalization

```
/blog/my-post-title-123  →  hostname/blog/*   (long hyphenated slugs → *)
/items/4829ab3f          →  hostname/items/*  (UUIDs → *)
/page/5                  →  hostname/page/*   (numeric IDs → *)
```

Prevents content flooding: visiting `/blog/post-1` and `/blog/post-2` counts as 2 of the 2-per-pattern limit.

---

### 7.5 Reporter

**File:** [src/lib/engine/reporter.ts](../src/lib/engine/reporter.ts)

Triggered after all sessions in a test run complete. Aggregates data, generates AI synthesis, and persists the final report.

#### `generateAndStoreReport(testRunId, force?)`

```
1. Check if valid summary already exists (skip if not force)
2. Fetch project LLM config
3. Fetch all sessions + their logs
4. Save raw logs to /tmp/specter/{userId}/{testRunId}.json
5. Aggregate:
   - Calculate per-session scores (calculateSessionScore)
   - Count all 9 emotion tags
   - Collect unique UX feedback strings (≤200 chars each)
   - Build qualitative context:
     • First 2 + last 2 steps per persona
     • All frustration/confusion/disappointment steps
     • Up to 5 delight/satisfaction/curiosity steps
6. AI synthesis (Gemini Flash text-only, always):
   - Executive summary (Markdown — ## headings required)
   - [ACTION_ITEMS] block parsed separately
7. Parse action items: priority | Fix: title | Detail: detail | Steps: PersonaName#N
8. Generate 2-3 sentence feedback summary
9. Collect technical audit data:
   - Drop-off URLs (last URL of non-completed sessions)
   - Broken link counts (from session_logs technical_metrics)
   - Slow pages (latency > 3000ms)
10. Upsert report to DB
11. Update test_run status → 'completed' (or 'stopped' if manually stopped)
```

#### `checkAndFinalizeTestRun(testRunId)`

Called by each orchestrator when its session completes. Checks if all sessions are done:

- Sessions stale for >15 minutes (`running` or `queued`) → auto-abandoned
- When `active.length === 0` → call `generateAndStoreReport()`

This means report generation is triggered by the last session to finish, with no polling required.

---

### 7.6 Semaphore

**File:** [src/lib/engine/semaphore.ts](../src/lib/engine/semaphore.ts)

Global browser concurrency control to prevent RAM exhaustion.

```typescript
MAX_CONCURRENT_BROWSERS = BROWSERBASE_API_KEY ? 5 : 2
// (overrideable via MAX_CONCURRENT_BROWSERS env var)
```

- Local Chromium: capped at 2 (each ~400–600MB RAM = ~1.2GB peak)
- BrowserBase: capped at 5 (remote browser, local RAM not a factor)

Sessions that can't acquire a slot wait in a FIFO promise queue until one is released. No session is dropped or errored — they all eventually run.

---

## 8. Scoring System

**File:** [src/lib/utils/scoring.ts](../src/lib/utils/scoring.ts)

### Philosophy

**Neutral baseline = 60.** A product users feel nothing about is mediocre, not acceptable. The asymmetric scoring reflects that users are more sensitive to negative experiences than positive ones.

### Emotion Weights

| Emotion | Weight | Rationale |
|---|---|---|
| `delight` | +15 | Gold standard — user is genuinely happy |
| `surprise` | +8 | Positive unexpected discovery |
| `satisfaction` | +6 | Task completed as expected |
| `curiosity` | +4 | Engaged, exploring |
| `neutral` | 0 | No signal — truly indifferent |
| `boredom` | -6 | Disengaged, passive dropout risk |
| `confusion` | -10 | Active friction — something unclear |
| `disappointment` | -12 | Expectation violated, trust damaged |
| `frustration` | -20 | Strongest negative — churn risk |

### Algorithm

```typescript
// For each step:
intensity = normalizeIntensity(log.action_taken?.emotional_intensity)
// Normalization: undefined → 0.5; 0-100 scale → /100; clamp 0-1
contribution = EMOTION_WEIGHTS[emotion] × intensity

// Aggregate:
averageWeight = sum(contributions) / totalSteps

// Map to 0-100:
if averageWeight >= 0:
  score = 60 + (averageWeight / 15) × 40    // [0, +15] → [60, 100]
else:
  score = 60 + (averageWeight / 20) × 60    // [0, -20] → [60, 0]

score = clamp(0, 100, round(score))
```

### Score Examples

| Scenario | Avg Weight | Score |
|---|---|---|
| All neutral (intensity 0.5) | 0 | 60 |
| All delight (intensity 1.0) | +15 | 100 |
| All frustration (intensity 1.0) | -20 | 0 |
| 80% curiosity + 20% frustration | -0.8 | 58 |
| 50% delight + 50% confusion | +2.5 | 67 |
| No logs | — | 50 (no-data fallback) |

### Edge Cases

- **No logs:** Returns 50 (unknown, not zero — avoids unfairly penalizing sessions that errored before collecting data)
- **Error sessions:** Same formula applied; error status alone does not affect score
- **Cohort average:** `calculateAverageScore()` skips error sessions with zero logs to avoid pulling the average to 50 unfairly

---

## 9. Persona System

### Pre-built Library (`SAMPLE_PERSONAS`)

**File:** [src/lib/constants/personas.ts](../src/lib/constants/personas.ts)

| ID | Name | Tech Literacy | Geolocation | Behavioral Archetype |
|---|---|---|---|---|
| 101 | Skeptical Founder | High | USA (SF) | ROI-focused, bounces if value unclear in 30s |
| 102 | Frustrated Senior | Low | UK | Confused by hamburger menus, panics at popups |
| 103 | Busy Executive | High | Germany | Skims for keywords, bounces at 3s+ load |
| 104 | Comparison Shopper | Medium | India | Price-sensitive, reads T&Cs, checks footer |
| 105 | The Power User | High | Canada | Expects keyboard shortcuts, tests edge cases |

### AI-Generated Cohort (Setup Wizard)

1. User enters URL → `suggestAudienceArchetypes()` server action
   - Scrapes site with Gemini Flash browser
   - Calls `llm.suggestArchetypes(siteContext)` → 6 archetype options
   - Cached in `ai_caches` by normalized URL
2. User selects archetypes → `generateAIPersonas()` server action
   - Scrapes site again (same browser init)
   - Calls `llm.generatePersonas(siteContext, userPrompt, archetypes)` → 5 personas
   - Cached unless `userPrompt` is non-empty (custom prompts bypass cache)

### Persona Profile Schema

```typescript
interface PersonaProfile {
  name: string;               // Role label ("Budget Traveler", not "John")
  age_range: string;          // e.g. "28-35"
  geolocation: string;        // e.g. "India"
  tech_literacy: 'low' | 'medium' | 'high';
  domain_familiarity: string; // e.g. "familiar with SaaS tools"
  goal_prompt: string;        // Behavioral directive
}
```

### Tech Literacy Impact on LLM Behavior

The `tech_literacy` field is injected directly into the LLM prompt:

> `"You are ${persona.name} (${persona.tech_literacy} tech literacy, goal: ${persona.goal_prompt})."`

This calibrates emotional responses:
- **Low:** More confusion/boredom; overwhelmed by complex layouts
- **Medium:** Balanced range
- **High:** More satisfaction from good patterns; more frustration from bad ones

---

## 10. Multi-LLM Architecture

### Two Distinct LLM Roles Per Session

| Role | Provider | Purpose |
|---|---|---|
| **Browser automation** (Stagehand) | Always Gemini Flash (env key) | Natural language → browser actions |
| **Reasoning / persona** (LLMService) | User's chosen provider | UX analysis, emotion scoring, navigation decisions |

Even when a user selects OpenRouter with Claude, Stagehand internally uses Gemini Flash for all actual browser interactions. The user's key exclusively drives the analysis/reasoning layer.

### LLMService Factory

```typescript
new LLMService({ provider: 'gemini' | 'openai' | 'openrouter' | 'ollama', apiKey?, modelName? })
// Defaults to GeminiProvider if provider omitted
// OpenRouter requires both apiKey and modelName
```

### OpenRouter Notes

- Uses OpenAI SDK with `baseURL: 'https://openrouter.ai/api/v1'`
- Vision fallback: if model returns 404 with "image input" error, retries text-only
- Model not found: immediate fail with actionable error message (suggests `:free` suffix for free models)
- Recommended minimum: `openai/gpt-4o-mini` (~$0.15/1M tokens) for reliable structured JSON + vision

### Report Synthesis Provider

Reports are **always** synthesized using the Gemini Flash env key, not the project's stored provider key. Rationale: the project key may be a vision-only budget key that fails on text-only synthesis; Gemini Flash is always available and cheap.

---

## 11. Realtime System

**Technology:** Supabase Realtime — WebSocket pub/sub over PostgreSQL change data capture.

### Channel Patterns

| Channel | Type | Source | Payload |
|---|---|---|---|
| `session_{sessionId}` | `postgres_changes` | DB row update | Session status, live_status |
| `logs_{sessionId}` | `postgres_changes` | DB row insert | New step logs |
| `terminal_{sessionId}` | `broadcast` | Orchestrator direct | Diagnostic strings |

### Postgres Changes (Durable)

Triggered by actual DB changes. Slight latency (~100ms). Frontend subscribes once session page loads:

```typescript
supabase.channel(`session_${sessionId}`)
  .on('postgres_changes', { event: 'UPDATE', table: 'persona_sessions', filter: `id=eq.${sessionId}` }, handler)
  .subscribe()

supabase.channel(`logs_${sessionId}`)
  .on('postgres_changes', { event: 'INSERT', table: 'session_logs', filter: `session_id=eq.${sessionId}` }, handler)
  .subscribe()
```

### Broadcast (Ephemeral)

Sent directly from the orchestrator process. Never persisted. Instant delivery. Used for the live diagnostics terminal:

```typescript
// In orchestrator:
this.channel.send({
  type: 'broadcast',
  event: 'log',
  payload: { message: status, timestamp: new Date().toISOString() }
})
```

The orchestrator subscribes its broadcast channel at session start and keeps the reference. The `updateLiveStatus()` method both updates the DB (for persistent state) and broadcasts (for instant UI update).

---

## 12. API Routes

### `GET /api/health`

Returns `{ status: 'ok' }`. Used by Railway health checks.

### `GET /api/reports/[testRunId]`

Returns the full report data for a test run. Used by the report page and PDF export.

### `POST /api/sessions/[sessionId]/step`

Manual mode only. Signals the orchestrator to advance one step:

```typescript
// Sets on persona_sessions row:
{ step_requested: true, is_paused: false }
```

The orchestrator polls this flag when paused in manual mode.

### `POST /api/webhooks/stripe`

Handles Stripe webhook events (subscription lifecycle, payment events).

### `POST /api/jobs/enqueue`

Stub — returns `{ message: 'Queue not implemented' }`. Reserved for future async job queue.

---

## 13. Server Actions

All server actions require Clerk authentication (`auth()` from `@clerk/nextjs/server`).

### `createTestRun(formData)` — [projects/actions.ts](../src/app/(dashboard)/projects/actions.ts)

Main test launch action. Called from the setup wizard.

```
1. Verify auth + JIT sync user to Supabase if not exists
2. Upsert project (user_id + target_url unique key)
   - Encrypts API key via vault.encrypt()
3. Insert test_run (status: 'pending')
4. For each persona:
   a. Insert persona_config
   b. For each instance (personaCount):
      - Insert persona_session (status: 'queued')
      - Launch orchestrator.runSession() — fire-and-forget (no await)
5. redirect('/test-runs/{id}')
```

> **Critical:** Orchestrator is launched without `await` to avoid Server Action timeout. The function returns and redirects while sessions run in the background.

### `suggestAudienceArchetypes(formData)`

```
1. Check ai_caches for 'archetypes:{url}'
2. On miss: launch browser, scrape site, get siteContext
3. llm.suggestArchetypes(siteContext) → 6 archetypes
4. Cache result, return
```

### `generateAIPersonas(formData)`

```
1. If no userPrompt: check ai_caches for 'personas:{url}'
2. On miss: launch browser, scrape site
3. llm.generatePersonas(siteContext, userPrompt, archetypes)
4. Map to UI persona format (ageRange, techLiteracy capitalized, etc.)
5. Cache result (unless userPrompt provided), return
```

### `rerunTestRun(runId)` — [test-runs/actions.ts](../src/app/(dashboard)/test-runs/actions.ts)

```
1. Fetch original test run + sessions + persona configs
2. Create new test_run
3. For each session:
   a. Create new persona_session with same persona_config
   b. Launch orchestrator.runSession() — fire-and-forget
4. Delete old test run data (logs → sessions → reports → test_run)
5. redirect('/test-runs/{newRunId}')
```

### `stopTestRun(runId)` — [test-runs/actions.ts](../src/app/(dashboard)/test-runs/actions.ts)

```
1. Update all running/queued sessions → abandoned
   (exit_reason: 'Manually stopped by user')
2. checkAndFinalizeTestRun(runId) → triggers report generation
3. Return { success: true }
```

---

## 14. Security

### Authentication

- **Clerk** handles auth UI, session management, and JWT issuance
- **Supabase RLS** enforces data access via `auth.jwt() ->> 'sub'` = Clerk user ID
- All dashboard routes are protected by Clerk middleware (`proxy.ts`)
- Server actions call `auth()` and throw on unauthorized

### API Key Encryption

User-provided LLM API keys (OpenRouter, OpenAI) are encrypted before storage:

```typescript
// vault.ts — AES-256-CBC
encrypt(text: string): string
// 1. Hash ENCRYPTION_KEY with SHA-256 → 32-byte key
// 2. Generate 16-byte random IV
// 3. Encrypt text
// 4. Return "iv_hex:ciphertext_hex"

decrypt(text: string): string
// 1. Split iv:ciphertext
// 2. Derive same 32-byte key from ENCRYPTION_KEY
// 3. Decrypt and return plaintext
```

The `ENCRYPTION_KEY` is a server-only environment variable never exposed to the client.

### Row Level Security

All 7 tables have RLS enabled. Policies use Clerk JWTs via `auth.jwt() ->> 'sub'`:

```sql
-- Example: session_logs are only accessible if the user owns the upstream project
CREATE POLICY "..." ON session_logs FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM persona_sessions
        JOIN test_runs ON test_runs.id = persona_sessions.test_run_id
        JOIN projects ON projects.id = test_runs.project_id
        WHERE persona_sessions.id = session_logs.session_id
          AND projects.user_id = auth.jwt() ->> 'sub'
    )
);
```

### Service Role Usage

The `createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS. Used exclusively for:
- Engine writes (orchestrator, reporter) — runs server-side, not accessible to users
- JIT user sync in server actions — needs to insert into `users` table

### Auth Page Policy

The LLM is explicitly instructed never to fill credentials:

```
⚠️ AUTH FORMS — STRICT RULE:
If the page contains a login/signup form, set type → 'skip_node'.
Do NOT type into any field. Do NOT click login/signup/submit.
```

Auth URLs are also detected by regex and routed through `analyzePageSections()` (no `next_links` followed from auth pages).

---

## 15. Frontend Components

### Dashboard Layout

**Sidebar:** Project navigation, test runs, reports, personas. Collapses on mobile.

**Auth gate:** Clerk's `<ClerkProvider>` wraps the root layout. `<SignIn>` / `<SignUp>` at Clerk catch-all routes.

**UserMenu:** Avatar, email, sign out.

**SyncUser:** Mounts on dashboard layout, fires `syncUserToDatabase()` server action once to ensure Supabase user record exists.

### Engine Components

| Component | Purpose |
|---|---|
| `LiveDashboardStats` | Realtime counters: running/completed/total sessions |
| `LiveSessionList` | Table of sessions with status, live_status, timestamp |
| `SessionLogAccordion` | Expandable steps with screenshots, emotion, feedback |
| `SessionControl` | Manual mode: pause/resume, next-step button |
| `StopButton` | Calls `stopTestRun()` → abandons all running sessions |
| `RerunButton` | Calls `rerunTestRun()` → creates new run with same personas |

### Report Components

| Component | Purpose |
|---|---|
| `FeedbackSummary` | Renders AI synthesis Markdown (`react-markdown` + `remark-gfm`) |
| `ActionItems` | Prioritized fix list (High/Medium/Low badges) |
| `SentimentTimeline` | Recharts line chart of emotion over session steps |
| `ClickHeatmap` | Canvas overlay of click coordinates on screenshots |
| `HeatmapOverlay` | Renders coordinate density using CSS + blur |
| `TechnicalAudit` | Broken links, slow pages, request failures |
| `AuditTrail` | Full step-by-step table with URL, emotion, monologue |
| `StepFeedbackCard` | Individual step: screenshot, emotion badge, UX feedback, proposed fix |
| `ReportActions` | Share link button, PDF export trigger |
| `RefreshButton` | Forces report regeneration via `generateAndStoreReport(force=true)` |

### Marketing Components

Animated landing page built with Framer Motion and Three.js:

| Component | Purpose |
|---|---|
| `ScrollyHero` | Scroll-driven text + animation sequence |
| `LegoModelSection` | Three.js 3D Lego pilot model with orbit controls |
| `UrlTypewriterSection` | URL typewriter effect cycling through demo sites |
| `ReportInsightSection` | Static report preview |
| `CtaSection` | Sign-up call to action with background beams animation |

---

## 16. Data Flows

### Setup Flow: Archetype & Persona Generation

```
User enters URL on setup page
        │
        ▼
suggestAudienceArchetypes(url)       [Server Action]
        │
        ├── Cache hit? → return cached archetypes
        │
        └── Cache miss:
             ├── browser.init()
             ├── browser.navigate(url)
             ├── browser.observe()  → siteContext (title + DOM)
             ├── browser.close()
             ├── llm.suggestArchetypes(siteContext) → 6 archetypes
             └── cache + return

User selects archetypes, clicks "Generate Personas"
        │
        ▼
generateAIPersonas(url, archetypes, userPrompt)   [Server Action]
        │
        └── (same browser + LLM flow)
             └── llm.generatePersonas() → 5 PersonaProfile objects
```

### Live Session View Flow

```
User navigates to /test-runs/{id}
        │
        ├── Server: fetch test_run + sessions from Supabase
        ├── Render LiveSessionList (initial state)
        │
        └── Client: subscribe to Supabase Realtime
             ├── channel('session_{id}'): session status updates
             │    → re-fetch session data on UPDATE
             ├── channel('logs_{id}'): new step logs
             │    → append to SessionLogAccordion
             └── channel('terminal_{id}'): broadcast messages
                  → append to diagnostics terminal
```

### Report Generation Flow

```
Last session completes → orchestrator.runSession() finally block
        │
        ▼
checkAndFinalizeTestRun(testRunId)
        │
        ├── Fetch all sessions for this run
        ├── Auto-abandon stale sessions (running > 15 min)
        ├── Check active.length === 0
        │
        └── generateAndStoreReport(testRunId)
             │
             ├── Aggregate all session logs
             ├── Calculate scores per session
             ├── Build qualitative context for LLM
             ├── Gemini: synthesize executive_summary + action items
             ├── Gemini: generate 2-3 sentence feedbackSummary
             ├── Collect technical audit data
             └── upsert reports table
                  │
                  ▼
             Frontend refreshes (polling or user action)
             Report page renders full analysis
```

---

## 17. Deployment

### Railway (Production)

```toml
# railway.toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "pnpm start"
```

**Dockerfile summary:**
1. `node:20-alpine` base
2. Install Playwright system dependencies (Chromium)
3. `pnpm install --frozen-lockfile`
4. `pnpm build` (Next.js production build)
5. `pnpm start` (Next.js server)

**Required Railway environment variables:** All variables from [Section 5](#5-environment-variables).

### Local Development

```bash
pnpm install
pnpm dev         # Next.js dev server with Turbopack
```

Browser sessions use local Chromium (no BrowserBase needed). Screenshots saved to `public/screenshots/{sessionId}/`.

### Supabase Migrations

Applied in order via Supabase CLI or dashboard:

```
supabase/migrations/
├── 0000_initial_schema.sql           # Core tables + RLS
├── 0002_extend_emotion_tag_enum.sql  # Added satisfaction, curiosity, etc.
├── 20260306_add_manual_control.sql   # is_paused, step_requested columns
├── 20260306_add_provider_settings.sql # llm_provider, llm_model_name, encrypted_llm_key
├── 20260310_persist_report_data.sql  # report_data JSONB column
├── 20260312_add_live_status.sql      # live_status column on persona_sessions
├── 20260318_add_ai_caches.sql        # ai_caches table
├── 20260318_enable_realtime.sql      # Add tables to realtime publication
└── 20260319_add_openrouter_support.sql # OpenRouter model fields
```

---

## 18. Operational Limits & Constraints

| Parameter | Value | Location |
|---|---|---|
| Max pages per session | 10 | `orchestrator.ts:MAX_PAGES` |
| Max screenshot slices per page | 5 | `browser.ts:_captureAllSlices` |
| Max DOM elements extracted | 60 | `browser.ts:extractDOMFast` |
| Max heuristic clicks per page | 4 | `orchestrator.ts:MAX_INTERACTIONS` |
| Max links harvested per page | 20 | `orchestrator.ts:LINK_HARVEST_MAX` |
| Max links sent to LLM | 25 | `llm.ts:buildPageAnalysisPrompt` |
| Max LLM sections (sampled) | 4 | `llm.ts:MAX_LLM_SECTIONS` |
| Max queue depth (SiteMap) | 50 | `sitemap.ts:MAX_QUEUE_DEPTH` |
| Content section limit | 2 per pattern | `sitemap.ts:CONTENT_PATTERN_LIMIT` |
| networkidle timeout (round 1) | 5s | `browser.ts:navigate` |
| networkidle timeout (round 2) | 6s | `browser.ts:navigate` |
| Content readiness timeout | 8s | `browser.ts:waitForContent` |
| Content readiness poll | 300ms | `browser.ts:waitForContent` |
| Browser concurrency (local) | 2 | `semaphore.ts` |
| Browser concurrency (Browserbase) | 5 | `semaphore.ts` |
| Max browser restarts per crawl | 3 | `orchestrator.ts:MAX_BROWSER_RESTARTS` |
| Stale session threshold | 15 min | `reporter.ts:STALE_THRESHOLD_MS` |
| Session retry count | 2 | `orchestrator.ts:MAX_RETRIES` |
| Gemini retry start delay | 10s | `llm.ts:withGeminiRetry` |
| Gemini retry max delay | 60s | `llm.ts:withGeminiRetry` |
| Gemini max retries | 4 | `llm.ts:withGeminiRetry` |
| Ollama per-call timeout | 120s | `llm.ts:OllamaProvider.call` |
| Screenshot JPEG quality | 45 | `browser.ts:captureSlice` |
| Action items in report | max 5 | `reporter.ts` |
| Report log path (local) | `/tmp/specter/{userId}/{testRunId}.json` | `reporter.ts` |

---

## 19. Type Reference

**File:** [src/lib/engine/types.ts](../src/lib/engine/types.ts)

### `UXEmotion`

```typescript
type UXEmotion = 'delight' | 'satisfaction' | 'curiosity' | 'surprise'
               | 'neutral'
               | 'confusion' | 'boredom' | 'frustration' | 'disappointment';
```

### `ActionType`

```typescript
type ActionType = 'click' | 'type' | 'scroll' | 'wait' | 'complete' | 'fail' | 'skip_node';
// UI-only: 'system' (not a real ActionType, used as fallback when action_taken is null)
```

### `Action`

```typescript
interface Action {
  type: ActionType;
  selector?: string;
  text?: string;
  reasoning: string;
  emotional_state: UXEmotion | string;
  emotional_intensity: number;        // 0.0 – 1.0
  current_url?: string;
  ux_feedback?: string;
  proposed_solution?: string;
  specific_emotion?: string;
  possible_paths?: string[];
}
```

### `ObservationSection`

```typescript
interface ObservationSection {
  screenshot: string;   // base64 JPEG (quality 45)
  domContext: string;   // JSON array of interactive elements (Slice-1 only; '[]' for others)
  label?: string;       // 'Slice-1' | 'Slice-2' | ... | 'Slice-5'
  scrollY?: number;     // scroll offset when screenshot was taken
}
```

### `Observation`

```typescript
interface Observation {
  screenshot: string;            // base64 JPEG of Slice-1
  url: string;
  title: string;
  domContext?: string;           // Same as sections[0].domContext
  dimensions: { width: number; height: number };  // always 1280×800
  sections?: ObservationSection[];
}
```

### `PersonaProfile`

```typescript
interface PersonaProfile {
  name: string;
  age_range: string;
  geolocation: string;
  tech_literacy: 'low' | 'medium' | 'high';
  domain_familiarity: string;
  goal_prompt: string;
}
```

### `HeuristicMetrics`

```typescript
interface HeuristicMetrics {
  broken_links: string[];         // "status: url" strings
  navigation_latency: number[];   // ms per page
  request_failures: number;
  action_latency: number[];       // ms per stagehand.act() call
  last_load_time: number;
}
```

### `PageScanAnalysis`

```typescript
interface PageScanAnalysis {
  sections: Array<{
    label: string;
    ux_feedback: string;
    emotional_state: UXEmotion | string;
    emotional_intensity: number;
    proposed_solution?: string;
  }>;
  overall_emotion: UXEmotion | string;
  overall_intensity: number;
  page_summary: string;
}
```

### `PageAnalysisResult` extends `PageScanAnalysis`

```typescript
interface PageAnalysisResult extends PageScanAnalysis {
  friction_points: string[];
  positives: string[];
  next_links: string[];
  journey_narrative_update: string;
}
```

### `LLMProvider` Interface

```typescript
interface LLMProvider {
  decideNextAction(obs, persona, history, blacklist?, triedElements?): Promise<Action>;
  analyzePageSections(sections, url, title, persona): Promise<PageScanAnalysis>;
  analysePage(sections, url, title, persona, isAuth, links, narrative): Promise<PageAnalysisResult>;
  generateSummary(prompt): Promise<string>;
  generatePersonas(siteContext, userPrompt, archetypes): Promise<PersonaProfile[]>;
  suggestArchetypes(siteContext): Promise<Archetype[]>;
}
```

### `Archetype`

```typescript
interface Archetype {
  id: string;
  icon_type: 'users' | 'zap' | 'user' | 'check' | 'globe' | 'x' | 'shopping-cart' | 'home' | 'settings';
  desc: string;
}
```

### `ScoringSession`

```typescript
interface ScoringSession {
  status: string;
  session_logs?: ScoringLog[];
  persona?: { tech_literacy: 'low' | 'medium' | 'high' };
}

interface ScoringLog {
  emotion_tag: UXEmotionTag | string;
  action_taken?: {
    emotional_intensity?: number;
    heuristic_finding?: string | null;
    technical_metrics?: { latency_ms?: number; has_errors?: boolean };
  };
}
```

---

## 20. Known Limitations & Roadmap

### Currently Incomplete

| Feature | Status | Notes |
|---|---|---|
| Manual mode UI | Backend done, frontend missing | `is_paused`/`step_requested` schema exists, `SessionControl` component exists, but toggle is not in setup wizard |
| Auth credential support | Schema exists, UI commented out | LLM is instructed to skip auth forms; actual credential injection not implemented |
| Heatmap visualization | `heatmap_data_url` field reserved | Coordinate data is collected and stored; rendering component (`ClickHeatmap`) exists but not connected to generated images |
| Concurrent session limits | No per-user throttling | Large cohorts (5 personas × 3 instances) could hit LLM rate limits simultaneously |
| Job queue | Stub route only | No durable async job queue; orchestrators run as fire-and-forget promises |

### Performance Characteristics

| Metric | Typical Value | Bottleneck |
|---|---|---|
| Browser init | 5–7s | Stagehand + Gemini connectivity check |
| Page navigation | 2–8s | Network + double networkidle |
| Screenshot capture (5 slices) | 1–2s | Playwright screenshot × 5 |
| DOM extraction | 100–200ms | Pure `page.evaluate()` |
| LLM analysis (Gemini Flash) | 3–8s | API call with 1–4 images |
| Full session (10 pages) | 3–8 min | Sum of all phases |
| Report synthesis | 10–30s | One LLM text call |

### Recommended LLM Models

| Provider | Recommended | Notes |
|---|---|---|
| Gemini (default) | `gemini-2.0-flash` | Fastest, cheapest, most reliable for this schema |
| OpenAI | `gpt-4o` (vision) + `gpt-4o-mini` (text) | Structured output via Zod |
| OpenRouter | `openai/gpt-4o-mini` | Cheapest reliable vision + JSON model (~$0.15/1M) |
| Ollama | `llama3.2-vision` | Only first screenshot sent; JSON quality varies |

> Free open-source models on OpenRouter (Llama, Qwen, Mistral) are unreliable for structured JSON output and vision tasks. Use with caution.

---

