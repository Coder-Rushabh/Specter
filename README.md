# Specter — Complete Technical Documentation

> **Version:** 1.0  
> **Author:** Rushabh Dabhade  
> **Status:** Live / Production  
> **Last Updated:** May 2026

---

## Table of Contents

1. [What is Specter?](#1-what-is-specter)
2. [Architecture Overview](#2-architecture-overview)
3. [Project Structure](#3-project-structure)
4. [Core Engine](#4-core-engine)
   - [Orchestrator](#41-orchestrator)
   - [Browser Service](#42-browser-service)
   - [LLM Service](#43-llm-service)
   - [Reporter](#44-reporter)
   - [SiteMap](#45-sitemap)
   - [Semaphore](#46-semaphore)
5. [Type System](#5-type-system)
6. [Database Schema](#6-database-schema)
7. [UX Scoring System](#7-ux-scoring-system)
8. [Frontend & Routing](#8-frontend--routing)
9. [UI Components](#9-ui-components)
10. [Environment Variables](#10-environment-variables)
11. [LLM Providers](#11-llm-providers)
12. [Authentication & Security](#12-authentication--security)
13. [Data Flow: End to End](#13-data-flow-end-to-end)
14. [Deployment](#14-deployment)
15. [Tech Stack](#15-tech-stack)
16. [Key Limits & Constraints](#16-key-limits--constraints)

---

## 1. What is Specter?

Specter is an AI-powered synthetic UX testing platform. It deploys autonomous AI personas that browse web applications like real users — navigating pages, capturing screenshots, and emitting emotion-tagged feedback — without requiring any human participant recruitment or session scheduling.

Each persona is driven by a language model that reads full-page screenshots and DOM context, assesses the UX quality of every section, identifies friction points, and decides which pages to visit next. When all personas complete their sessions, an AI-written executive report is generated with ranked action items, an emotion breakdown, and a 0–100 UX health score.

**Core value proposition:**

- No user recruitment — results in minutes, not weeks
- Each persona has a distinct demographic profile, tech literacy level, and behavioral goal
- Reports include per-step emotion logs, heatmap data, broken link detection, and load time audits
- Supports four LLM providers (Gemini, OpenAI, OpenRouter, Ollama) with per-project configuration

---

## 2. Architecture Overview

### High-Level Flow

```
User selects project + personas
         │
         ▼
Test run created (DB) → N sessions launched (fire-and-forget)
         │
         ├── Session 1 ──► Orchestrator ──► BrowserService ──► LLMService
         ├── Session 2 ──► Orchestrator ──► BrowserService ──► LLMService
         └── Session N ──► Orchestrator ──► BrowserService ──► LLMService
                                │
                                ▼
                    Crawl-Reason-Repeat loop (up to 10 pages)
                    ┌──────────────────────────────────────────┐
                    │  1. Navigate → capturePageSections()     │
                    │  2. extractDOMFast() → interactive elems │
                    │  3. runInteractions() → heatmap clicks   │
                    │  4. fingerprintHeaderFooter() → dedup    │
                    │  5. LLM.analysePage() → JSON analysis    │
                    │  6. Validate next_links against DOM      │
                    │  7. SiteMap.enqueue(validated links)     │
                    │  8. Log steps to DB (batched every 3)    │
                    └──────────────────────────────────────────┘
                                │
                                ▼
                    All sessions complete
                                │
                                ▼
                    Reporter: aggregate + AI synthesis → reports table
                                │
                                ▼
                    UI: Report page with visualizations
```

### Key Design Decision: Crawl-Reason-Repeat

Unlike traditional step-by-step browser automation (where the LLM is in the loop for every click), Specter uses a **Crawl-Reason-Repeat** architecture:

1. The browser navigates to a URL and takes full-page screenshots (up to 8 slices)
2. The browser is **not** held open during LLM reasoning — only screenshots and DOM metadata are passed
3. The LLM analyzes all slices in a **single call** and returns UX feedback plus recommended next URLs
4. Recommended URLs are validated against actual DOM-harvested links (hallucinated URLs are dropped)
5. Valid URLs are enqueued and the loop continues

This reduces browser resource usage significantly compared to interactive LLM-driven agents and makes the analysis reproducible.

---

## 3. Project Structure

```
specter/
├── src/
│   ├── app/
│   │   ├── (marketing)/               # Public-facing pages (no auth required)
│   │   │   ├── page.tsx               # Landing page
│   │   │   ├── about/page.tsx
│   │   │   ├── pricing/page.tsx
│   │   │   ├── product/page.tsx
│   │   │   └── docs/page.tsx
│   │   │
│   │   ├── (dashboard)/               # Auth-protected application routes
│   │   │   ├── layout.tsx             # Dashboard shell + sidebar
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx           # Project list
│   │   │   │   ├── actions.ts         # Server actions for project CRUD
│   │   │   │   └── [projectId]/
│   │   │   │       ├── page.tsx       # Project detail + launch
│   │   │   │       └── setup/page.tsx # URL input + persona selection
│   │   │   ├── test-runs/
│   │   │   │   ├── page.tsx           # Test run list
│   │   │   │   └── [runId]/page.tsx   # Live session view + progress
│   │   │   ├── reports/
│   │   │   │   ├── page.tsx           # Report list
│   │   │   │   └── [testRunId]/page.tsx # Full report with visualizations
│   │   │   ├── sessions/
│   │   │   │   └── [sessionId]/page.tsx # Live persona monologue stream
│   │   │   └── personas/page.tsx      # Persona library management
│   │   │
│   │   ├── api/
│   │   │   ├── sessions/[sessionId]/step/route.ts  # Manual mode: advance step
│   │   │   ├── reports/[testRunId]/route.ts         # DELETE report
│   │   │   └── health/route.ts                      # Health check endpoint
│   │   │
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   ├── sign-up/[[...sign-up]]/page.tsx
│   │   ├── layout.tsx                 # Root layout + ClerkProvider
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── reports/                   # Report visualization (15 components)
│   │   ├── engine/                    # Live session UI components
│   │   ├── marketing/                 # Landing page sections
│   │   ├── dashboard/                 # Nav + sidebar
│   │   ├── auth/                      # User menu, Clerk sync
│   │   ├── forms/                     # Input forms
│   │   └── ui/                        # Shared primitives (button, effects)
│   │
│   └── lib/
│       ├── engine/                    # Core automation engine
│       │   ├── orchestrator.ts        # Session runner + crawl loop
│       │   ├── browser.ts             # Stagehand wrapper
│       │   ├── llm.ts                 # Multi-provider LLM service
│       │   ├── reporter.ts            # Report generation
│       │   ├── sitemap.ts             # URL queue + deduplication
│       │   ├── semaphore.ts           # Browser concurrency control
│       │   └── types.ts               # Shared TypeScript interfaces
│       │
│       ├── utils/
│       │   ├── scoring.ts             # UX health score calculation
│       │   ├── vault.ts               # AES-256-CBC encryption
│       │   ├── scrollToStep.ts        # UI scroll helper
│       │   └── constants/
│       │       └── personas.ts        # Pre-built persona library
│       │
│       ├── supabase/
│       │   ├── client.ts              # Client-side Supabase client
│       │   ├── server.ts              # Server-side Supabase client
│       │   └── admin.ts               # Service-role client (bypasses RLS)
│       │
│       ├── types.ts                   # Database TypeScript types
│       ├── constants.ts               # Global constants
│       └── utils.ts                   # Shared utilities
│
├── supabase/
│   └── migrations/                    # 10 sequential SQL migration files
│
├── scripts/
│   └── export-logs.mjs                # CLI tool: export session logs to JSON
│
├── public/
│   └── screenshots/                   # Dev: local screenshot storage
│
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

---

## 4. Core Engine

The engine lives in `src/lib/engine/` and is composed of six modules. All modules run server-side within Next.js API routes or server actions.

### 4.1 Orchestrator

**File:** `src/lib/engine/orchestrator.ts`

The Orchestrator is the top-level session controller. It manages the full lifecycle of a single persona session: browser initialization, the crawl loop, database logging, real-time status broadcasting, error recovery, and teardown.

#### Class: `Orchestrator`

```typescript
class Orchestrator {
  async runSession(
    sessionId: string,
    url: string,
    persona: PersonaProfile,
    llmConfig?: { provider: 'gemini' | 'openrouter' | 'ollama' | 'openai'; apiKey?: string; modelName?: string },
    browserMode?: 'browserbase' | 'local'
  ): Promise<void>
}
```

**`runSession`** is the main entry point. It is called once per persona session and runs to completion (or failure) before returning.

#### Internal Constants

| Constant | Value | Purpose |
|---|---|---|
| `MAX_PAGES` | `10` | Hard cap on unique pages visited per session |
| `DB_FLUSH_INTERVAL` | `3` | Number of steps between DB log flushes |
| `LINK_HARVEST_MAX` | `20` | Max links harvested from a single page |
| `MAX_BROWSER_RESTARTS` | `3` | Max BrowserBase session renewals per crawl |
| `MAX_INTERACTIONS` | `4` | Max heuristic clicks per page |
| `MAX_RETRIES` | `2` | Max full-session retry attempts on error |

#### Session Lifecycle

```
runSession()
│
├── 0. Fetch session config from DB (persona_configs + projects)
│   └── Resolve: LLM provider, API key, browser mode
│
├── 1. Mark session status = 'running' in DB
│
├── 2. Acquire browser semaphore (blocks if concurrency limit reached)
│
├── 3. Initialize BrowserService (Stagehand + Chromium/BrowserBase)
│
├── 4. runCrawl() — Crawl-Reason-Repeat loop
│
├── 5. Mark session status = 'completed' in DB
│
├── 6. flushLogs() — flush remaining buffered steps
│
└── 7. finally block:
    ├── browser.close()
    ├── releaseBrowser() (semaphore)
    ├── flushTerminalLogs() → /tmp/specter/{sessionId}-terminal.json
    └── checkAndFinalizeTestRun() → triggers report if all sessions done
```

#### Crawl Loop (`runCrawl`)

```
while (visited < MAX_PAGES):
  pageUrl = siteMap.dequeue()
  if !pageUrl → break (queue empty)
  if siteMap.hasVisited(pageUrl) → continue

  ── Check session not abandoned ──────────────────────────────────
  Query DB for session status; exit if 'abandoned' or 'completed'

  ── Phase 1a: Browser capture ─────────────────────────────────────
  browser.navigate(pageUrl)
  browser.exportCookies()           → checkpoint for crash recovery
  browser.observeFastPage()         → full-page sections (1–8 slices)
  browser.getContentLinks(20)       → harvest DOM links

  ── Phase 1b: Heuristic interactions ──────────────────────────────
  runInteractions()                 → up to 4 Playwright clicks for heatmap

  ── Header/footer dedup ───────────────────────────────────────────
  browser.fingerprintHeaderFooter() → skip identical chrome in LLM call

  ── Phase 2: LLM reasoning ────────────────────────────────────────
  if isAuth:
    llm.analyzePageSections()       → UX-only analysis, no next_links
  else:
    llm.analysePage()               → full analysis + friction + next_links

  ── DB logging ────────────────────────────────────────────────────
  log one entry per section (step_number increments)
  last section gets page_summary, friction_points, positives, technical_metrics

  ── Enqueue next links ────────────────────────────────────────────
  Validate LLM next_links against DOM-harvested links (drop hallucinations)
  siteMap.enqueue(validated + harvested links)

  flushLogs() every DB_FLUSH_INTERVAL steps
```

#### Browser Restart Handling

When BrowserBase kills a remote session mid-crawl (`socket-close`, `cdp transport`, `session timed out`, etc.), the Orchestrator:

1. Detects the error via `isBrowserTimeoutError()` — matches 16 distinct error message patterns
2. Increments `browserRestarts` counter; aborts if `> MAX_BROWSER_RESTARTS`
3. Re-enqueues the failed page URL before closing the browser
4. Re-initializes a fresh BrowserBase session
5. Restores saved cookies (`lastGoodCookies`) to preserve auth state
6. Continues the crawl from where it left off

#### Log Buffering

Step logs are not written to Supabase on each step. Instead they are pushed to an in-memory `logBuffer` array and flushed in batches via `flushLogs()`:

- Called every `DB_FLUSH_INTERVAL = 3` steps during the crawl
- Called unconditionally at the end of the crawl and in the `finally` block
- Reduces DB round-trips from N (one per step) to N/3

#### Terminal Logs

All `clog()` output (structured console logs with `[HH:MM:SS.mmm] [sessionId]` prefix) is accumulated in `terminalLogs[]` and written to `/tmp/specter/{sessionId}-terminal.json` at session end. If the test run's main JSON file already exists at `/tmp/specter/{userId}/{testRunId}.json`, the terminal logs are patched into that file under the matching session entry.

#### URL Normalization (`normalizeUrl`)

URLs are normalized before deduplication and visited-set comparisons:

- Strips `www.` prefix from hostname
- Strips trailing slash from pathname (unless pathname is `/`)
- Lowercases the result
- Strips query strings and fragments

---

### 4.2 Browser Service

**File:** `src/lib/engine/browser.ts`

The BrowserService wraps Stagehand (a Playwright-based browser abstraction) and provides all browser operations used by the Orchestrator.

#### Key Methods

**`init(modelName, apiKey?, browserMode?)`**

Launches a Stagehand instance. In `local` mode, starts a local Chromium process. In `browserbase` mode, connects to a BrowserBase remote browser. Always sets viewport to `1280×800`. Also registers a `dialog` event listener on the underlying Playwright page to auto-dismiss native browser dialogs (alerts, confirms, notification prompts).

**`navigate(url)`**

Loads a URL and waits for content using a two-round strategy:

1. Waits for `networkidle` with a 5s timeout
2. Waits for `networkidle` again with a 6s timeout (handles late lazy-loaded resources)
3. Calls `waitForContent()` — custom readiness polling

**`waitForContent(timeoutMs = 8000)`**

Polls every 300ms (up to `timeoutMs`) for all of the following to be true:

- `document.readyState === 'complete'`
- Visible text length > 100 characters
- No active loading spinners, skeleton loaders, or `[aria-busy]` elements
- No API-pending placeholders ("No videos found.", "Loading...", etc.)

This handles React hydration delays, skeleton screens, and lazy API calls that are invisible to standard `networkidle` waits.

**`capturePageSections()`**

Captures the full page as N sequential viewport-height JPEG screenshots:

1. Measures total page height
2. Calculates number of slices (1 viewport = 1 slice, capped at 8)
3. Scrolls to each position, waits 200ms for scroll-triggered content
4. After Slice-1: calls `dismissPopups()` to clear cookie banners, modals, and overlays
5. Each screenshot: JPEG quality 45, 1280×800, base64-encoded
6. Attaches DOM context (from `extractDOMFast()`) to Slice-1 only

**`dismissPopups()`**

Three-step popup dismissal strategy:

1. Sends `Escape` key — closes most native modal dialogs
2. Clicks the first visible close/accept button matching cookie banner, GDPR, Intercom, and generic modal selectors
3. Force-hides any remaining `position: fixed` overlay matching popup keyword patterns via injected JavaScript

**`extractDOMFast()`**

Pure Playwright `page.evaluate()` call (~100ms, no Stagehand overhead) that returns up to 60 interactive elements:

```typescript
{
  index: number;
  role: string;         // HTML tag or ARIA role
  text: string;         // visible label / placeholder / aria-label
  selector: string;     // CSS selector
  coordinates: { x: number; y: number; w: number; h: number };
}
```

Prioritizes links, buttons, and inputs. Skips elements with no visible text and elements outside the viewport.

**`getContentLinks(max)`**

Returns up to `max` absolute URLs from the page's `<a href>` elements, filtered to same-hostname only.

**`getHeuristicClicks(max)`**

Returns up to `max` clickable elements for heuristic interaction. Selects visible CTAs, navigation links, and buttons from the current viewport.

**`clickAtCoords(x, y)`**

Clicks at absolute document coordinates using Playwright's `page.mouse.click()`. Returns `{ newUrl, screenshot }` after the click settles.

**`observeFastPage()`**

Orchestrates the full page capture sequence: calls `capturePageSections()` and returns an `Observation` object with all sections.

**`fingerprintHeaderFooter()`**

Extracts the raw HTML of the page's `<header>` and `<footer>` elements (or top/bottom fixed elements), hashes them, and returns `{ header: string, footer: string }` fingerprints. Used by the Orchestrator to skip re-analyzing identical navigation chrome across pages.

**`getLastPageMetrics()`**

Returns per-page performance deltas since the last `navigate()` call:

```typescript
{
  latency_ms: number;           // Navigation load time
  broken_links_count: number;   // 4xx/5xx responses on this page
  request_failures: number;     // Network-level request failures
}
```

**`exportCookies()`** / **`restoreCookies(cookies)`**

Serializes/deserializes browser cookies via Playwright's `context.cookies()` and `context.addCookies()`. Used by the Orchestrator to checkpoint auth state before each page and restore it after a browser restart.

**`getCurrentUrl()`**

Returns the current page URL from the Playwright page object.

**`close()`**

Closes the Stagehand instance and underlying browser.

---

### 4.3 LLM Service

**File:** `src/lib/engine/llm.ts`

The LLMService provides a unified interface over four LLM providers. All providers implement the `LLMProvider` interface defined in `types.ts`.

#### Supported Providers

| Provider Class | Default Model | Notes |
|---|---|---|
| `GeminiProvider` | `gemini-2.0-flash` | Default and recommended. Uses Google's native JSON mode. Cheapest, fastest. |
| `OpenAIProvider` | `gpt-4o` (vision), `gpt-4o-mini` (text) | Structured output via `zodResponseFormat()`. `detail: 'low'` for cost control. |
| `OpenRouterProvider` | Any vision model | Passes images as `image_url` with `detail: 'low'`. Free open-source models are unreliable for structured JSON — use `openai/gpt-4o-mini` as minimum. |
| `OllamaProvider` | `llama3.2-vision` (configurable) | Fully local inference. Sends only the primary screenshot (VRAM constraint). No API keys required. |

#### `LLMService` Constructor

```typescript
new LLMService({ provider: 'gemini' | 'openai' | 'openrouter' | 'ollama', apiKey?: string, modelName?: string })
```

Instantiates the appropriate provider class based on `provider`. Falls back to `GeminiProvider` if provider is unknown. `apiKey` and `modelName` are passed through to the provider.

#### Core Methods

**`analysePage(sections, pageUrl, pageTitle, persona, isAuthPage, availableLinks, journeyNarrative)`**

The primary analysis method used in the Crawl-Reason-Repeat loop. Sends all page slices + DOM context to the LLM in a single structured call.

Input:
- `sections`: Array of `ObservationSection` (up to 8 screenshot slices)
- `pageUrl`, `pageTitle`: Page metadata
- `persona`: Full `PersonaProfile` (drives tone and focus of feedback)
- `isAuthPage`: `true` for login/signup pages — LLM returns empty `next_links`
- `availableLinks`: DOM-harvested links from this page (constrains LLM navigation suggestions)
- `journeyNarrative`: Running first-person summary of the session so far

Output: `PageAnalysisResult`

**`analyzePageSections(sections, pageUrl, pageTitle, persona)`**

Simpler analysis used for auth pages. No navigation intent, no `next_links`. Returns `PageScanAnalysis` with per-section UX feedback and an overall emotion.

**`generatePersonas(siteContext, userPrompt, archetypes)`**

Generates 5 `PersonaProfile` objects from a site description + user intent + selected archetypes. Called during project setup.

**`suggestArchetypes(siteContext)`**

Generates 6 `Archetype` objects describing likely user segments for a given site. Called during project setup to seed the archetype selection UI.

**`generateSummary(prompt)`**

Text-only generation used for report synthesis and feedback summary. Uses the cheapest available text model (Gemini Flash or GPT-4o-mini).

**`decideNextAction(observation, persona, history, blacklist?, triedElements?)`**

Legacy method from the original interactive agent loop. Not used in the current Crawl-Reason-Repeat engine but retained in the `LLMProvider` interface for backward compatibility.

#### Zod Schemas

All structured LLM outputs are validated with Zod schemas defined in `llm.ts`:

| Schema | Used For |
|---|---|
| `ActionSchema` | Legacy step-by-step interaction output |
| `SectionResultSchema` | Per-section UX feedback (label, emotion, intensity, feedback, proposed_solution) |
| `PageScanSchema` | Full-page scan output (sections[], overall_emotion, overall_intensity, page_summary) |
| `PageAnalysisResultSchema` | Extended scan + friction_points, positives, next_links, journey_narrative_update |
| `PersonaSchema` | Single persona profile |
| `ArchetypeSchema` | Single audience archetype |

#### Provider Reliability Notes

- **Gemini 2.0 Flash**: Fastest and most cost-effective. Recommended for all production use.
- **OpenRouter free models**: Unreliable for vision and structured JSON. Minimum viable model: `openai/gpt-4o-mini`.
- **Ollama**: Works well for privacy-sensitive environments. Only the primary viewport screenshot is sent (due to local VRAM limits).
- **OpenAI**: Most reliable structured output via Zod. Use `gpt-4o` for vision, `gpt-4o-mini` for text-only synthesis.

---

### 4.4 Reporter

**File:** `src/lib/engine/reporter.ts`

The Reporter generates and persists the aggregated report for a completed test run.

#### `generateAndStoreReport(testRunId, force?)`

Called automatically by `checkAndFinalizeTestRun()` when all sessions in a test run reach a terminal state.

**Steps:**

1. **Guard:** Skip if a valid non-placeholder summary already exists (unless `force = true`)
2. **Fetch:** Load all sessions + logs for the test run from DB
3. **Save raw logs:** Write `{ testRunId, sessions: [...] }` to `/tmp/specter/{userId}/{testRunId}.json`. Each session entry includes `terminalLogs` read from the per-session file written by the Orchestrator
4. **Aggregate:**
   - Calculate per-session scores via `calculateSessionScore()`
   - Count emotions across all steps (all 9 emotion tags)
   - Collect unique UX feedback strings (> 10 chars, non-system steps)
   - Build `qualitativeData[]` — key log lines for LLM context:
     - First 2 + last 2 steps per session
     - All frustration/confusion/disappointment steps
     - Up to 5 delight/satisfaction/curiosity steps (balanced picture)
     - Per-page structured findings (friction_points + positives from last section of each page)
5. **AI synthesis (Gemini or OpenAI):**
   - Always uses `GEMINI_API_KEY` env var if present (text-only, cost-efficient)
   - Falls back to OpenAI if project's provider is `openai` and no Gemini key is set
   - Generates a Markdown executive summary with `## Strategic UX Audit`, `## What's Working`, `## Key Friction Points` sections
   - Generates up to 5 action items in a structured `[ACTION_ITEMS]...[/ACTION_ITEMS]` block
   - Generates a 2–3 sentence plain-text feedback summary
6. **Parse action items:** Extracts `priority`, `title`, `detail`, and optional `stepRefs` from the action items block
7. **Technical audit:** Aggregates broken links, slow pages (> 3000ms), and rage click events from log metadata
8. **Persist:** Upserts into `reports` table (conflict on `test_run_id`)
9. **Finalize:** Updates `test_runs.status` to `'completed'` (or `'stopped'` if manually stopped)

#### `checkAndFinalizeTestRun(testRunId)`

Called by each Orchestrator's `finally` block. Logic:

1. Fetch all sessions for the test run
2. Mark stale sessions as `abandoned` (sessions in `running`/`queued` state not updated in > 15 minutes)
3. If no sessions remain `running` or `queued`, call `generateAndStoreReport(testRunId)`

#### `ReportSummary` Interface

```typescript
interface ReportSummary {
  personaName: string;
  goal: string;
  status: 'completed' | 'abandoned' | 'error';
  steps: number;
  summary: string;
  keyFindings: string[];
  journey: {
    step: number;
    action: string;
    emotions: string;
    monologue: string;
  }[];
}
```

#### Report Data Structure (stored in `reports.report_data` JSONB)

```json
{
  "emotionStats": {
    "delight": 12,
    "satisfaction": 8,
    "curiosity": 15,
    "surprise": 3,
    "neutral": 20,
    "confusion": 6,
    "boredom": 2,
    "frustration": 4,
    "disappointment": 3
  },
  "sessionScores": [72, 68, 81, 65, 77],
  "actionItems": [
    {
      "priority": "High",
      "title": "Simplify checkout flow",
      "detail": "Three personas abandoned at the payment step due to unclear error messaging.",
      "stepRefs": [{ "personaName": "Budget Traveler", "stepNumber": 14 }]
    }
  ],
  "feedbackSummary": "Users found the onboarding intuitive but struggled with the pricing page...",
  "totalFeedbackPoints": 47,
  "dropOffStats": { "https://example.com/checkout": 2 },
  "technicalAudit": {
    "brokenLinks": [{ "url": "https://example.com/features", "error": "2 broken link(s)" }],
    "slowPages": [{ "url": "https://example.com/dashboard", "latency": 4200 }],
    "frictionPoints": []
  }
}
```

---

### 4.5 SiteMap

**File:** `src/lib/engine/sitemap.ts`

The SiteMap is a priority-sorted URL queue with deduplication, content-pattern limiting, and external URL filtering. One instance is created per crawl session.

#### URL Priority Tiers

| Pattern | Priority Score | Rationale |
|---|---|---|
| `/pricing`, `/plans`, `/buy`, `/purchase` | 10 | Highest business value |
| `/checkout`, `/cart`, `/payment` | 9 | Conversion-critical |
| `/features`, `/product`, `/overview`, `/tour` | 8 | Core product pages |
| `/about`, `/company`, `/team`, `/mission` | 6 | Brand discovery |
| `/docs`, `/guide`, `/help`, `/faq` | 5 | Support content |
| `/blog`, `/news`, `/posts` | 3 | Content, lower UX signal |
| `/changelog`, `/release` | 2 | Lowest priority |
| (default) | 5 | Any unmatched page |

Each priority score gets a random sub-1 jitter (`Math.random() * 0.9`) so pages within the same tier are visited in randomized order across different sessions.

#### Dequeue Strategy

65% probability: take the highest-priority item (normal priority behavior).  
35% probability: pick a random item from anywhere in the queue — ensures lower-priority pages still get visited rather than being perpetually deferred.

#### Filters Applied During `enqueue()`

1. **External hostname filter:** Only URLs on the same hostname (or subdomains) as `startUrl` are accepted
2. **Query string / fragment stripping:** `?` and `#` and everything after are removed — treats `/page?id=1` and `/page?id=2` as the same URL
3. **File extension skip:** URLs ending in `.jpg`, `.pdf`, `.css`, `.js`, `.woff`, etc. are dropped
4. **Already visited:** Normalized URL already in `visited` map → skip
5. **Already queued:** Normalized URL already in queue → skip
6. **Content pattern limit:** Max 2 blog/docs articles per URL pattern (e.g., `/blog/*` → 2 max). Prevents the queue from flooding with blog articles
7. **Queue depth cap:** Maximum 50 URLs in the queue at any time

#### URL Pattern Normalization (`urlPattern`)

Variable URL segments are collapsed to `*` for pattern counting:

- Pure numeric segments (`/123` → `/*`)
- UUID-like segments (`/a1b2c3d4-...` → `/*`)
- Long hyphenated slugs (> 25 chars, contains `-`, e.g., `/blog/my-very-long-article-title` → `/*`)

This ensures `/blog/post-1` and `/blog/post-2` map to the same pattern `example.com/blog/*` for the 2-article limit.

#### Auth URL Detection

```typescript
static isAuthUrl(url: string): boolean
```

Returns `true` for URLs matching: `/login`, `/signin`, `/sign-in`, `/signup`, `/sign-up`, `/register`, `/auth`, `/account/create`, `/join`, `/onboarding`

Auth pages are captured and analyzed for UX quality but do not contribute `next_links` (the persona does not attempt to log in).

#### Journey Narrative

`siteMap.journeyNarrative` is a running first-person narrative string that the LLM updates after analyzing each page. It provides context to the LLM on subsequent pages ("I've seen the landing page and clicked into pricing, now I'm looking at..."). The Orchestrator reads and passes this narrative to `llm.analysePage()` and appends `journey_narrative_update` from the LLM response.

---

### 4.6 Semaphore

**File:** `src/lib/engine/semaphore.ts`

A module-level concurrency limiter for browser instances. Prevents memory exhaustion in local mode and respects BrowserBase plan limits in cloud mode.

```typescript
export async function acquireBrowser(): Promise<void>
export function releaseBrowser(): void
```

**Limits:**

| Mode | Default Max | Override |
|---|---|---|
| Local (no `BROWSERBASE_API_KEY`) | 2 | `MAX_CONCURRENT_BROWSERS` env var |
| BrowserBase (`BROWSERBASE_API_KEY` set) | 5 | `MAX_CONCURRENT_BROWSERS` env var |

Each local Chromium instance uses ~400–600 MB RAM; the 2-instance cap keeps peak usage around 1.2 GB on a standard container. BrowserBase runs remotely so the limit is relaxed to 5.

If `acquireBrowser()` is called when `active >= MAX_CONCURRENT_BROWSERS`, the caller is queued (Promise pending). When `releaseBrowser()` is called, the next queued caller is resolved.

---

## 5. Type System

All engine types are defined in `src/lib/engine/types.ts`.

### `ActionType`

```typescript
type ActionType = 'click' | 'type' | 'scroll' | 'wait' | 'complete' | 'fail' | 'skip_node';
```

| Value | Description |
|---|---|
| `click` | Agent clicked an element |
| `type` | Agent typed text into an input |
| `scroll` | Agent scrolled the page |
| `wait` | Agent waited |
| `complete` | Task successfully completed |
| `fail` | Agent cannot complete the task |
| `skip_node` | Agent skipped to the next navigation node |

Note: A `'system'` pseudo-type is used in UI components for log entries generated by the Orchestrator (session start, session end, browser restart), not by the agent loop.

### `UXEmotion`

```typescript
type UXEmotion =
  | 'delight' | 'satisfaction' | 'curiosity' | 'surprise'
  | 'neutral'
  | 'confusion' | 'boredom' | 'frustration' | 'disappointment';
```

Nine emotion states ordered from most positive to most negative. Maps directly to scoring weights in `scoring.ts`. Used in `Action.emotional_state`, `PageScanAnalysis.overall_emotion`, and all section-level analysis.

### `Action`

Full record of one agent decision step. Stored as `session_logs.action_taken` JSONB.

```typescript
interface Action {
  type: ActionType;
  selector?: string;           // CSS/XPath selector of target element
  text?: string;               // Text typed or button label clicked
  reasoning: string;           // LLM's explanation for this action
  emotional_state: UXEmotion | string;
  emotional_intensity: number; // 0.0 – 1.0
  current_url?: string;
  ux_feedback?: string;        // UX observation at this step
  proposed_solution?: string;  // Suggested fix for friction found
  specific_emotion?: string;   // Granular emotion label (free text)
  possible_paths?: string[];   // Alternative navigation paths considered
}
```

### `ObservationSection`

A single viewport-height screenshot slice.

```typescript
interface ObservationSection {
  screenshot: string;  // base64 JPEG (quality 45)
  domContext: string;  // JSON array of interactive elements (Slice-1 only; '[]' for others)
  label?: string;      // 'Slice-1' | 'Slice-2' | ... | 'Slice-8'
  scrollY?: number;    // Scroll offset (px) when captured
}
```

DOM context shape (per element in the array):

```typescript
{
  index: number;
  role: string;       // HTML tag or ARIA role
  text: string;       // Visible label / placeholder / aria-label
  selector: string;   // CSS selector
  coordinates: { x: number; y: number; w: number; h: number };
}
```

### `Observation`

Full page capture result returned by `observeFastPage()`.

```typescript
interface Observation {
  screenshot: string;                              // base64 JPEG of Slice-1
  url: string;
  title: string;
  domContext?: string;                             // Same as sections[0].domContext
  dimensions: { width: number; height: number };  // Always 1280×800
  sections?: ObservationSection[];                 // All slices (1–8)
}
```

### `PersonaProfile`

Configuration for one AI persona.

```typescript
interface PersonaProfile {
  name: string;               // Role name, e.g., "Budget Traveler"
  age_range: string;          // e.g., "28–35"
  geolocation: string;        // e.g., "India"
  tech_literacy: 'low' | 'medium' | 'high';
  domain_familiarity: string; // e.g., "Familiar with SaaS tools"
  goal_prompt: string;        // Behavioural prompt driving the session
}
```

### `HeuristicMetrics`

Technical performance metrics collected per page.

```typescript
interface HeuristicMetrics {
  broken_links: string[];       // URLs with 4xx/5xx responses
  navigation_latency: number[]; // ms per page navigation
  request_failures: number;     // Network-level failures
  action_latency: number[];     // ms per Stagehand act() call
  last_load_time: number;       // ms for most recent navigation
}
```

Note: `getLastPageMetrics()` returns per-page deltas (not cumulative session totals).

### `PageScanAnalysis`

Returned by `analyzePageSections()`. Used for auth pages.

```typescript
interface PageScanAnalysis {
  sections: Array<{
    label: string;
    ux_feedback: string;
    emotional_state: UXEmotion | string;
    emotional_intensity: number;  // 0.0 – 1.0
    proposed_solution?: string;
  }>;
  overall_emotion: UXEmotion | string;
  overall_intensity: number;
  page_summary: string;
}
```

### `PageAnalysisResult`

Returned by `analysePage()`. Extends `PageScanAnalysis` with navigation intent.

```typescript
interface PageAnalysisResult extends PageScanAnalysis {
  friction_points: string[];          // Concrete UX problems on this page
  positives: string[];                // Well-executed UX elements
  next_links: string[];               // 3–5 recommended next URLs (validated against DOM)
  journey_narrative_update: string;   // One-sentence update to the running narrative
}
```

### `LLMProvider`

Interface implemented by all four provider classes.

```typescript
interface LLMProvider {
  decideNextAction(observation, persona, history, blacklist?, triedElements?): Promise<Action>;
  analyzePageSections(sections, pageUrl, pageTitle, persona): Promise<PageScanAnalysis>;
  analysePage(sections, pageUrl, pageTitle, persona, isAuthPage, availableLinks, journeyNarrative): Promise<PageAnalysisResult>;
  generateSummary(prompt): Promise<string>;
  generatePersonas(siteContext, userPrompt, archetypes): Promise<PersonaProfile[]>;
  suggestArchetypes(siteContext): Promise<Archetype[]>;
}
```

### `Archetype`

User archetype option shown in the test setup UI.

```typescript
interface Archetype {
  id: string;
  icon_type: 'users' | 'zap' | 'user' | 'check' | 'globe' | 'x' | 'shopping-cart' | 'home' | 'settings';
  desc: string;
}
```

---

## 6. Database Schema

Supabase (PostgreSQL) with Row Level Security enabled on all tables. The Orchestrator uses the service-role admin client (`supabase/admin.ts`) to bypass RLS.

### Migration History

| File | Description |
|---|---|
| `0000_initial_schema.sql` | Core tables, enums, and RLS policies |
| `0002_extend_emotion_tag_enum.sql` | Adds all 9 emotion values to the `emotion_tag` enum |
| `20260306_add_manual_control.sql` | Adds `execution_mode`, `is_paused`, `step_requested` to `persona_sessions` |
| `20260306_add_provider_settings.sql` | Adds `llm_provider`, `encrypted_llm_key`, `save_llm_key` to `projects` |
| `20260310_persist_report_data.sql` | Adds `report_data` JSONB column to `reports` |
| `20260312_add_live_status.sql` | Adds `live_status` TEXT to `persona_sessions` |
| `20260318_add_ai_caches.sql` | Creates `ai_caches` table for global LLM response caching |
| `20260318_enable_realtime.sql` | Enables Supabase Realtime on session tables |
| `20260319_add_openrouter_support.sql` | Adds `llm_model_name` column; expands provider constraint to include `openrouter` |
| `20260504_add_browser_mode.sql` | Adds `browser_mode` column to `persona_sessions` |

### Tables

#### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT` (PK) | Clerk user ID (e.g., `user_abc123`) |
| `email` | `TEXT` (UNIQUE) | |
| `name` | `TEXT` | |
| `plan_tier` | `ENUM('free','pro','team')` | Default `'free'` |
| `stripe_customer_id` | `TEXT` | |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | |

#### `projects`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` (PK) | |
| `user_id` | `TEXT` (FK → users) | |
| `name` | `TEXT` | |
| `target_url` | `TEXT` | Starting URL for crawl |
| `requires_auth` | `BOOLEAN` | |
| `auth_credentials` | `TEXT` | Encrypted JSON |
| `llm_provider` | `TEXT` | `'gemini'` \| `'openai'` \| `'openrouter'` \| `'ollama'` |
| `encrypted_llm_key` | `TEXT` | AES-256-CBC encrypted API key |
| `save_llm_key` | `BOOLEAN` | User preference to persist key |
| `llm_model_name` | `TEXT` | Model override (OpenRouter: e.g., `openai/gpt-4o-mini`) |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | |

Unique constraint: `(user_id, target_url)`.

#### `persona_configs`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` (PK) | |
| `project_id` | `UUID` (FK → projects, nullable) | `NULL` for library personas |
| `user_id` | `TEXT` (FK → users) | Direct owner link |
| `name` | `TEXT` | Role name |
| `age_range` | `TEXT` | |
| `geolocation` | `TEXT` | |
| `tech_literacy` | `ENUM('low','medium','high')` | |
| `goal_prompt` | `TEXT` | Behavioural prompt |
| `ai_system_prompt` | `TEXT` | Expanded LLM-generated profile |
| `domain_familiarity` | `TEXT` | |
| `persona_count` | `INTEGER` | Number of instances to deploy (default 1) |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | |

#### `test_runs`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` (PK) | |
| `project_id` | `UUID` (FK → projects) | |
| `status` | `ENUM('pending','running','completed','failed')` | |
| `started_at` | `TIMESTAMPTZ` | |
| `completed_at` | `TIMESTAMPTZ` | |
| `created_at` | `TIMESTAMPTZ` | |

#### `persona_sessions`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` (PK) | |
| `test_run_id` | `UUID` (FK → test_runs) | |
| `persona_config_id` | `UUID` (FK → persona_configs) | |
| `status` | `ENUM('queued','running','completed','abandoned','error')` | |
| `exit_reason` | `TEXT` | Human-readable completion reason |
| `execution_mode` | `TEXT` | `'autonomous'` \| `'manual'` (default `'autonomous'`) |
| `is_paused` | `BOOLEAN` | Manual mode: pause flag |
| `step_requested` | `BOOLEAN` | Manual mode: advance-one-step signal |
| `live_status` | `TEXT` | Real-time status string (broadcast via Realtime) |
| `browser_mode` | `TEXT` | `'browserbase'` \| `'local'` (default `'browserbase'`) |
| `started_at`, `completed_at`, `created_at` | `TIMESTAMPTZ` | |

#### `session_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` (PK) | |
| `session_id` | `UUID` (FK → persona_sessions) | |
| `step_number` | `INTEGER` | Sequential per-session (starts at 1) |
| `current_url` | `TEXT` | URL being analyzed at this step |
| `screenshot_url` | `TEXT` | Supabase Storage public URL or `/screenshots/…` local path |
| `emotion_tag` | `ENUM(9 values)` | One of the 9 UX emotions |
| `emotion_score` | `INTEGER` | 1–10 legacy field (mostly superseded by intensity in JSONB) |
| `inner_monologue` | `TEXT` | Persona's UX feedback text |
| `action_taken` | `JSONB` | Variable shape — see below |
| `created_at` | `TIMESTAMPTZ` | |

**`action_taken` JSONB shapes by `type`:**

```
type: 'system'        — { type, info: 'session_started' | 'session_completed' | ... }
type: 'page_section'  — { type, info, label, proposed_solution, specific_emotion,
                          local_screenshot_path,
                          [last section only:] page_summary, friction_points, positives,
                          overall_emotion, overall_intensity, technical_metrics }
type: 'click'         — { type, info: 'heuristic_interaction', text, coordinates: {x,y,w,h},
                          navigated_to, local_screenshot_path }
```

#### `reports`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` (PK) | |
| `test_run_id` | `UUID` (UNIQUE FK → test_runs) | One report per test run |
| `product_opportunity_score` | `INTEGER` | 0–100 UX health score |
| `executive_summary` | `TEXT` | AI-generated Markdown |
| `funnel_completion_rate` | `DECIMAL(5,2)` | % of sessions that completed |
| `heatmap_data_url` | `TEXT` | (reserved) |
| `report_data` | `JSONB` | Full structured data (see Reporter section) |
| `created_at` | `TIMESTAMPTZ` | |

#### `ai_caches`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` (PK) | |
| `cache_key` | `TEXT` (UNIQUE) | Hash of prompt/input |
| `payload` | `JSONB` | Cached LLM response |
| `cache_type` | `TEXT` | Category label |
| `created_at` | `TIMESTAMPTZ` | |

Global table: any authenticated user can read/insert. Used to cache expensive LLM calls (e.g., persona generation) across users.

### Row Level Security

All tables have RLS enabled. Users can only access data that belongs to them (traced through `projects.user_id`). The service-role admin client used by the Orchestrator and Reporter bypasses RLS entirely.

---

## 7. UX Scoring System

**File:** `src/lib/utils/scoring.ts`

Calculates a 0–100 UX health score from session log emotion data. Used in the Reporter (for storing scores) and in the frontend (for displaying scores without a DB round-trip).

### Emotion Weights

| Emotion | Weight | Rationale |
|---|---|---|
| `delight` | +20 | Gold standard — maps to score of 100 |
| `satisfaction` | +12 | Quiet success |
| `surprise` | +12 | Positive discovery |
| `curiosity` | +8 | Active engagement |
| `neutral` | 0 | No signal — maps to baseline 70 |
| `confusion` | -10 | Hard blocker |
| `boredom` | -6 | Disengagement signal |
| `disappointment` | -12 | Recoverable negative |
| `frustration` | -20 | Churn risk — maps to score of 0 |

### Score Calculation

```
For each log step:
  intensity = normalizeIntensity(action_taken.emotional_intensity)
                → undefined/null → 0.5
                → value 1–100 → divide by 100
                → otherwise → clamp to [0, 1]
  contribution = EMOTION_WEIGHTS[emotion_tag] × intensity

averageWeight = Σ(contributions) / totalSteps

if averageWeight ≥ 0:
  score = 70 + (averageWeight / 20) × 30    → maps [0, +20] to [70, 100]
else:
  score = 70 + (averageWeight / 20) × 70    → maps [0, -20] to [70, 0]

score = clamp(round(score), 0, 100)
```

**Baseline rationale:** A fully neutral site scores 70, not 100. A product that generates no reaction is mediocre — the scoring reflects that.

**Edge cases:**

- No logs → returns 50 (no data = unknown, not perfect)
- `error`/`abandoned` sessions with no logs are excluded from averages to avoid skewing the result to 50

### `calculateSessionScore(session)`

Returns `{ mainScore: number, emotionScores: Record<string, number> }`.

`emotionScores` is a breakdown of what percentage of steps had each emotion (e.g., `{ frustration: 15, neutral: 40, delight: 10, ... }`).

### `calculateAverageScore(sessions[])`

Returns a single number representing the average `mainScore` across all sessions, skipping sessions with `error` status and no logs.

---

## 8. Frontend & Routing

### Marketing Routes (`/src/app/(marketing)/`)

No authentication required.

| Route | Page |
|---|---|
| `/` | Hero landing page with 3D Lego model (Three.js + React Three Fiber) |
| `/about` | Company info |
| `/pricing` | Plans and pricing |
| `/product` | Feature overview |
| `/docs` | Documentation |

### Dashboard Routes (`/src/app/(dashboard)/`)

All protected by Clerk authentication. Users are redirected to `/sign-in` if not authenticated.

| Route | Purpose |
|---|---|
| `/dashboard` | Main dashboard hub |
| `/projects` | List all projects; create new project |
| `/projects/[projectId]` | View/edit project; launch test run |
| `/projects/[projectId]/setup` | URL input + persona archetype selection |
| `/test-runs` | List all test runs with status |
| `/test-runs/[runId]` | Live session view with real-time progress |
| `/reports` | List all completed reports |
| `/reports/[testRunId]` | Full report with all visualizations |
| `/sessions/[sessionId]` | Live persona monologue stream + step accordion |
| `/personas` | Manage persona library |

### API Routes (`/src/app/api/`)

| Route | Method | Purpose |
|---|---|---|
| `/api/sessions/[sessionId]/step` | `POST` | Manual mode: advance session one step |
| `/api/reports/[testRunId]` | `DELETE` | Delete a report and its test run |
| `/api/health` | `GET` | Health check (returns `{ status: 'ok' }`) |

### Server Actions

Key server actions (all marked `'use server'`):

| File | Actions |
|---|---|
| `src/app/(dashboard)/projects/actions.ts` | `createProject`, `updateProject`, `deleteProject`, `rerunTestRun` |
| `src/app/actions/reports.ts` | `generateReport`, `exportReportToPDF` |
| `src/app/actions/user.ts` | `syncUserFromClerk` |

---

## 9. UI Components

### Report Components (`src/components/reports/`)

| Component | Purpose |
|---|---|
| `FeedbackSummary.tsx` | Emotion timeline chart + word frequency visualization |
| `ClickHeatmap.tsx` | Interactive heatmap with click-coordinate overlay |
| `WebsiteHeatmap.tsx` | Static heatmap rendered over a page screenshot |
| `AuditTrail.tsx` | Chronological step-by-step session log |
| `StepFeedbackCard.tsx` | Per-step card: emotion badge, monologue, proposed solution |
| `ActionItems.tsx` | Ranked friction points (High / Medium / Low priority) |
| `TechnicalAudit.tsx` | Load times, broken links, network failures |
| `SentimentTimeline.tsx` | Per-persona emotion progression chart (Recharts) |
| `ReportCard.tsx` | Summary card: overall score + key findings |
| `ReportsList.tsx` | Table of all reports with score badges |
| `ReportActions.tsx` | Export to PDF, delete, share actions |
| `AutoRefresh.tsx` | Polls `reports` table until report is generated; shows progress |
| `PageFindings.tsx` | Per-page friction/positive findings breakdown |

### Live Session Components (`src/components/engine/`)

| Component | Purpose |
|---|---|
| `LiveSessionList.tsx` | Real-time list of active persona sessions with status |
| `SessionLogAccordion.tsx` | Expandable step list with emoji emotion indicators |
| `SessionControl.tsx` | Play / pause / stop controls; manual mode step button |
| `LiveDashboardStats.tsx` | Progress counters: pages visited, steps logged, active sessions |
| `StopButton.tsx` | Abort all sessions in a test run |
| `RerunButton.tsx` | Restart the test run with the same personas |

### Marketing Components (`src/components/marketing/`)

| Component | Purpose |
|---|---|
| `ScrollyHero.tsx` | Full-viewport hero section with scroll-triggered animations |
| `LegoModelSection.tsx` | Interactive 3D Lego model (Three.js + React Three Fiber) |
| `ReportInsightSection.tsx` | Animated report preview section |
| `NavBar.tsx` | Marketing navigation |
| `CTASection.tsx` | Call-to-action section |

### Shared UI (`src/components/ui/`)

| Component | Purpose |
|---|---|
| `button.tsx` | Standard button primitive |
| `google-gemini-effect.tsx` | Animated SVG path glow effect |
| `background-beams-with-collision.tsx` | Canvas-based animated beam background |

---

## 10. Environment Variables

All variables are read server-side unless prefixed with `NEXT_PUBLIC_`.

```env
# ── Supabase ──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Anon/public key (used in browser)
SUPABASE_SERVICE_ROLE_KEY=         # Service role key (Orchestrator + Reporter — bypasses RLS)
SUPABASE_SCREENSHOTS_BUCKET=       # Storage bucket name for screenshots (e.g., "screenshots")
                                   # If unset, screenshots are saved to /public/screenshots/ locally

# ── Clerk (Authentication) ────────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# ── LLM Providers ─────────────────────────────────────────────────────────────
GEMINI_API_KEY=                    # Default provider. Used for browser init (Stagehand) and report synthesis.
OPENAI_API_KEY=                    # Optional. Used when project's llm_provider = 'openai'.

# ── BrowserBase (Cloud Browser) ───────────────────────────────────────────────
BROWSERBASE_API_KEY=               # If set, uses BrowserBase for remote browser sessions.
                                   # If unset, uses local Chromium.
BROWSERBASE_PROJECT_ID=            # Required if BROWSERBASE_API_KEY is set.

# ── Concurrency ───────────────────────────────────────────────────────────────
MAX_CONCURRENT_BROWSERS=           # Override default concurrency limit (2 local / 5 BrowserBase)

# ── Encryption ────────────────────────────────────────────────────────────────
ENCRYPTION_KEY=                    # 32+ character key for AES-256-CBC encryption of user LLM keys

# ── Ollama (Local LLM) ────────────────────────────────────────────────────────
OLLAMA_HOST=http://localhost:11434  # Ollama API endpoint
OLLAMA_MODELS=llama3.2-vision       # Default model for Ollama provider
```

---

## 11. LLM Providers

### Provider Selection

LLM provider is configured **per project** in the dashboard. The provider and (optionally) API key are stored in the `projects` table. The API key is encrypted with AES-256-CBC before storage.

Provider resolution order in `runSession()`:

1. Explicit `llmConfig` parameter (passed programmatically)
2. `projects.llm_provider` + `projects.encrypted_llm_key` from DB
3. Falls back to `'gemini'` if neither is set

### Gemini (Default)

- **Model:** `gemini-2.0-flash`
- **Used for:** Page analysis + report synthesis + browser initialization (Stagehand)
- **JSON mode:** Uses Google's native `responseMimeType: 'application/json'`
- **Fallback parsing:** `safeParseGeminiJson()` handles malformed responses (strips markdown fences, trailing commas)
- **Cost:** Cheapest option; recommended for all production workloads

### OpenAI

- **Vision model:** `gpt-4o` — used for `analysePage()` and `analyzePageSections()`
- **Text model:** `gpt-4o-mini` — used for `generateSummary()`, `generatePersonas()`, `suggestArchetypes()`
- **Structured output:** `zodResponseFormat()` for guaranteed schema compliance
- **Image encoding:** `detail: 'low'` on all image_url inputs for cost control
- **Cost:** More expensive than Gemini; use when stricter JSON compliance is required

### OpenRouter

- **Model:** Any model specified in `projects.llm_model_name`
- **Image encoding:** `image_url` with `detail: 'low'`
- **Reliability note:** Free open-source models (Llama, Qwen, Mistral) frequently fail on structured JSON and vision. Minimum reliable model: `openai/gpt-4o-mini`
- **Use case:** Access to specialized or cost-optimized models

### Ollama

- **Default model:** `llama3.2-vision` (configurable via `OLLAMA_MODELS` env var)
- **Images:** Only the primary screenshot (Slice-1) is sent — local VRAM constraint
- **Privacy:** Fully local — no data leaves the server
- **Use case:** Air-gapped environments, privacy-sensitive applications, development

---

## 12. Authentication & Security

### User Authentication

Clerk handles all user authentication (OAuth via Google/GitHub, email/password). On first sign-in, `syncUserFromClerk()` creates a matching row in Supabase's `users` table.

### API Key Encryption

User-provided LLM API keys are encrypted with AES-256-CBC before storage in `projects.encrypted_llm_key`. The `ENCRYPTION_KEY` environment variable provides the symmetric key. Keys are decrypted on-demand in the Orchestrator using `decrypt()` from `src/lib/utils/vault.ts`.

### Row Level Security

All Supabase tables have RLS enabled. Policies ensure users can only read and modify their own data (traced through `projects.user_id → auth.jwt() ->> 'sub'`). The service-role admin client (`supabase/admin.ts`) bypasses RLS for Orchestrator and Reporter operations.

### Supabase Clients

| Client | File | Used By | Auth |
|---|---|---|---|
| Browser client | `supabase/client.ts` | Frontend components | User JWT (Clerk) |
| Server client | `supabase/server.ts` | Server actions, API routes | User JWT (Clerk) |
| Admin client | `supabase/admin.ts` | Orchestrator, Reporter | Service role key (bypasses RLS) |

---

## 13. Data Flow: End to End

```
1. User selects project + personas in UI
   └── POST to server action: rerunTestRun()

2. Server creates test_run (status: 'pending')
   ├── Creates N persona_sessions (status: 'queued')
   └── Launches N Orchestrator.runSession() calls (fire-and-forget, no await)

3. [Per Orchestrator — runs concurrently, semaphore-limited]
   │
   ├── Fetch session config from DB
   ├── Acquire browser semaphore (blocks if at concurrency limit)
   ├── Initialize BrowserService (Stagehand + Chromium/BrowserBase)
   ├── Update session status → 'running'
   │
   ├── Crawl loop (up to MAX_PAGES = 10):
   │   ├── SiteMap.dequeue() → next URL
   │   ├── browser.navigate(url)
   │   ├── browser.observeFastPage() → 1–8 screenshot slices
   │   ├── browser.getContentLinks(20) → harvested links
   │   ├── runInteractions() → 0–4 heuristic clicks (heatmap data)
   │   ├── fingerprintHeaderFooter() → dedup identical chrome
   │   ├── llm.analysePage() → structured JSON analysis
   │   ├── Validate next_links against harvested links
   │   ├── siteMap.enqueue(valid links)
   │   ├── Log each section to logBuffer
   │   └── flushLogs() every 3 steps → insert to session_logs table
   │
   ├── Mark session status → 'completed'
   └── finally: close browser, release semaphore, flush logs, flush terminal logs
       └── checkAndFinalizeTestRun() → if all sessions done, run Reporter

4. [Reporter — runs after last session completes]
   ├── Fetch all sessions + logs
   ├── Save raw logs to /tmp/specter/{userId}/{testRunId}.json
   ├── calculateSessionScore() per session
   ├── Aggregate emotion stats + feedback
   ├── llm.generateSummary() → Markdown executive summary + action items
   ├── Parse action items from [ACTION_ITEMS] block
   ├── Aggregate technical audit (broken links, slow pages)
   └── Upsert into reports table
       └── Update test_runs.status → 'completed'

5. [UI — polling and live updates]
   ├── Test run page: subscribes to persona_sessions changes via Supabase Realtime
   ├── Session page: subscribes to session_logs inserts (step-by-step stream)
   ├── Broadcasts on terminal_{sessionId} channel for live diagnostic logs
   └── Report page: AutoRefresh polls until reports.executive_summary is populated
```

---

## 14. Deployment

### Platform: Railway

Deployed via Dockerfile on Railway. The build step runs `pnpm build` (Next.js production build). The container serves via `pnpm start`.

### Docker Build

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next /app/.next
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/public /app/public
CMD ["pnpm", "start"]
```

### Required Environment Variables for Production

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_SCREENSHOTS_BUCKET
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
GEMINI_API_KEY
ENCRYPTION_KEY
BROWSERBASE_API_KEY         (if using cloud browsers)
BROWSERBASE_PROJECT_ID      (if using cloud browsers)
```

### Running Locally

```bash
pnpm install
pnpm dev
```

Browser sessions use local Chromium by default when `BROWSERBASE_API_KEY` is not set. Local development screenshots are saved to `/public/screenshots/` instead of Supabase Storage.

---

## 15. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.1.6 |
| Language | TypeScript | ^5 |
| Runtime | React | 19.2.3 |
| Styling | Tailwind CSS | ^4 |
| Animations | Framer Motion | ^12 |
| 3D Graphics | Three.js + React Three Fiber | ^0.183 / ^9.5 |
| Charts | Recharts | ^3.8 |
| Auth | Clerk | ^7 |
| Database | Supabase (PostgreSQL + Realtime + Storage) | ^2.98 |
| Browser Automation | Stagehand (`@browserbasehq/stagehand`) | ^3.1 |
| Cloud Browser | BrowserBase | — |
| LLM — Default | Google Gemini 2.0 Flash | — |
| LLM — OpenAI | GPT-4o / GPT-4o-mini | — |
| LLM — OpenRouter | Any vision model | — |
| LLM — Local | Ollama (`llama3.2-vision`) | — |
| Schema Validation | Zod | ^4.3 |
| Encryption | Node.js `crypto` (AES-256-CBC) | built-in |
| PDF Export | html2pdf.js + jsPDF | — |
| Package Manager | pnpm | — |
| Hosting | Railway | — |

---

## 16. Key Limits & Constraints

| Constraint | Value | Reason |
|---|---|---|
| Max pages per session | 10 | Token budget and browser resource limits |
| Max screenshot slices per page | 8 | LLM context window constraints |
| Max DOM elements extracted | 60 | Keeps prompt manageable; focuses on interactive elements |
| Max heuristic clicks per page | 4 | Interaction data for heatmap; not required for analysis |
| Max links harvested per page | 20 | Prevents queue flooding |
| Max URL queue depth | 50 | Memory safety cap |
| Content section limit (blog/docs) | 2 per URL pattern | Prevents blog crawl flooding |
| Max browser restarts per crawl | 3 | BrowserBase session renewal limit |
| Max session retry attempts | 2 | Full-session recovery on non-config errors |
| Stale session threshold | 15 minutes | Auto-abandoned if no DB update in 15 min |
| Local browser concurrency | 2 | ~500 MB per Chromium; keeps peak ~1.2 GB |
| BrowserBase concurrency | 5 | Remote; no local RAM concern |
| Log buffer flush interval | 3 steps | Reduces DB round-trips |
| `networkidle` timeout (round 1) | 5s | Standard page load wait |
| `networkidle` timeout (round 2) | 6s | Late lazy-loaded resources |
| Content readiness timeout | 8s | Custom hydration + skeleton wait |
| JPEG screenshot quality | 45 | Balanced between visual fidelity and token cost |
| Viewport size | 1280×800 | Fixed for consistent LLM analysis |

---

*Specter v1.0 — Built by Rushabh Dabhade*
