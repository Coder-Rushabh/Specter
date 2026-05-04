# Crawl-Reason-Repeat Architecture

Current implementation of the Specter engine as of March 2026.

---

## Overview

Each test session runs one **Crawl-Reason-Repeat** loop. A single browser instance is kept alive for the entire session. For every page the engine:

1. **BROWSER PHASE** — navigate → fast-screenshot (Top / Mid / Bottom) → harvest links → heuristic clicks
2. **LLM PHASE** — analyse all section screenshots in one call → UX feedback + friction + positives + next links + narrative update
3. **PERSIST** — flush section logs + page-summary log + screenshots to DB
4. **ENQUEUE** — feed LLM-suggested and harvested links into the SiteMap priority queue
5. **REPEAT** until `MAX_PAGES = 15` reached or queue is empty

```
╔══ CRAWL START ══ persona: Sarah ══ target: https://example.com
║  page budget: 15 | browser: single instance reused across all pages
║
╠══ PAGE 1/15 ══
║  URL   : https://example.com/
║  QUEUE : 0 pages waiting
║  ── PHASE 1: BROWSER ─────────────────────────────
║    Navigate             +1842ms (load: 1842ms, broken: 0, reqFail: 0)
║    observeFastPage      +820ms  → 3 sections [Top, Mid, Bottom]
║    getContentLinks      +110ms  → 18 links
║    INTERACTIONS (4 targets) ──────────────────────
║      Click #1: "Work" at (640, 48) → no navigation
║      Click #2: "Services" at (720, 48) → no navigation
║      Click #3: "Get Started" at (960, 200) → navigated to /signup
║      Click #4: "Case Studies" at (300, 400) → no navigation
║  ── PHASE 2: LLM REASONING ───────────────────────
║    LLM done             +4200ms
║    Emotion  : curiosity (0.72)
║    Summary  : Clean homepage with strong visual hierarchy…
║    Friction (1): ✗ Value proposition below fold on mobile
║    Positives (2): ✓ Fast load, ✓ Clear CTA placement
║    Next links (3): → /pricing → /features → /case-studies
╠══ PAGE 1 DONE ══ 7820ms ══ queue: 15 ══ visited: 1/15
```

---

## Key Design Decisions

### Single Browser Instance (Not Per-Page)

The original proposal opened a new browser per page. This was abandoned because Stagehand init takes **5–7 seconds** per launch (Playwright + Gemini connectivity check). For 15 pages that adds ~90 seconds of pure startup overhead.

**Current approach:** `BrowserService.init()` is called once at the start of `runSession()`. The same Chromium instance navigates all 15 pages sequentially. The browser is closed in the `finally` block after the session ends.

```typescript
// In runSession():
await acquireBrowser();              // global semaphore (prevents > N concurrent)
await this.browser.init('google/gemini-2.0-flash', apiKey);
await this.runCrawl(sessionId, url, persona, resumeState);
// finally:
await this.browser.close();
releaseBrowser();
```

### No `stagehand.observe()` During Capture

`stagehand.observe()` makes a Gemini LLM call (~3–5 seconds per call) to extract interactive elements. It was removed from the capture phase. Screenshots alone are sent to the analysis LLM.

**Current approach:** `observeFastPage()` takes JPEG screenshots at Top / Mid / Bottom scroll positions using `page.screenshot()` only. No observe call.

```typescript
// Fast path — no stagehand.observe(), just screenshots
await this.page.evaluate(() => window.scrollTo(0, 0));
sections.push(await this.captureSlice('Top'));    // screenshot only

await this.page.evaluate(y => window.scrollTo(0, y), midY);
sections.push(await this.captureSlice('Mid'));

await this.page.evaluate(() => window.scrollTo(0, scrollHeight));
sections.push(await this.captureSlice('Bottom'));
```

Sections captured: Top always, Mid if page height > 1.5× viewport, Bottom if > 2.2× viewport.

### Heuristic Interactions (Phase 1b)

After the capture phase, up to 4 clicks are fired using pure Playwright (no LLM). These are logged with `{x, y, w, h}` coordinates for the heatmap overlay.

**Strategy:**
- Queries `a[href], button, [role="button"]` from the live DOM
- Filters by computed style (`display:none / visibility:hidden / opacity:0` are skipped)
- Skips `mailto:`, `tel:`, `javascript:` hrefs
- Priority scoring: explicit CTA text (10) > button element (8) > nav/header element (7) > any anchor (4)
- Returns **absolute document coordinates** (not viewport-relative): `r.left + window.scrollX, r.top + window.scrollY`
- `clickAtCoords()` scrolls the element to viewport centre before firing `mouse.click()`

```typescript
// Absolute coords so clicking works regardless of scroll position
const absX = Math.round(r.left + scrollX + r.width / 2);
const absY = Math.round(r.top + scrollY + r.height / 2);
```

If a click navigates away, the destination URL is enqueued and the browser returns to the original page to finish the interaction set.

### Single LLM Call Per Page (`analysePage`)

The original plan made separate LLM calls per section. Current implementation makes **one call per page** with all section screenshots included. This halves LLM latency for multi-section pages.

`analysePage()` returns:

```typescript
interface PageAnalysisResult {
    // Per-section (one entry per Top/Mid/Bottom)
    sections: Array<{
        label: string;
        ux_feedback: string;
        emotional_state: UXEmotion;
        emotional_intensity: number;  // 0.0–1.0
        proposed_solution?: string;
    }>;
    // Page-level
    overall_emotion: UXEmotion;
    overall_intensity: number;
    page_summary: string;
    friction_points: string[];       // concrete UX problems
    positives: string[];             // well-executed elements
    next_links: string[];            // 3–5 URLs to visit next (empty for auth pages)
    journey_narrative_update: string; // one sentence appended to the running narrative
}
```

### Journey Narrative (Cross-Page Memory)

Each LLM call receives the accumulated `journeyNarrative` string so the emotional arc carries across pages — the LLM knows what the persona saw on previous pages when evaluating the current one.

```
After page 1 (/):
  "Arrived on the homepage — clean design, value proposition visible above fold. Felt curious."

After page 2 (/pricing):
  "… Pricing page has three tiers but feature differences are hard to scan. Felt confused about which plan fits."

After page 3 (/signup):
  "… Signup form appeared immediately after confusing pricing. Form is straightforward but uncertainty about value remains."
```

The narrative is stored in `siteMap.journeyNarrative` and grows across the session.

---

## SiteMap Priority Queue

`sitemap.ts` manages the URL queue and visited-set for the session.

### Priority Scoring

URLs are scored before enqueuing. Higher-priority pages are visited earlier even if the session hits `MAX_PAGES`:

| URL pattern | Score |
|---|---|
| `/pricing`, `/plans`, `/buy` | 10 |
| `/checkout`, `/cart`, `/payment` | 9 |
| `/features`, `/product`, `/tour` | 8 |
| `/about`, `/company`, `/team` | 6 |
| `/docs`, `/help`, `/faq` | 5 |
| `/blog`, `/news`, `/articles` | 3 |
| `/changelog`, `/release` | 2 |
| everything else | 5 (default) |

### Filtering Rules

Applied on every `enqueue()` call before a URL enters the queue:

1. **External links** — dropped if hostname doesn't match `baseHostname` (including sub-domains of base)
2. **Static assets** — `.jpg .png .gif .pdf .zip .css .js .woff` dropped via regex
3. **Content section cap** — `/blog/*`, `/docs/*`, `/news/*` etc. limited to `CONTENT_PATTERN_LIMIT = 2` unique URLs per pattern (prevents blog flooding)
4. **Queue depth cap** — `MAX_QUEUE_DEPTH = 50` total items
5. **Already visited** — checked against normalized URL (strips `www.`, trailing `/`, lowercased)
6. **Already queued** — checked to prevent duplicate queue entries

### URL Pattern Normalization

Variable segments are collapsed to `*` for content deduplication:
- `/blog/my-long-article-title` → pattern `example.com/blog/*`
- Segments that are all digits, 8+ hex chars, or hyphenated slugs > 25 chars are replaced with `*`

### Auth URL Detection

```
/(login|signin|sign-in|signup|sign-up|register|auth|account/create|join|onboarding)
```

Auth pages are visited and analysed (screenshot + UX feedback on form design, copy, trust signals) but `analysePage()` is called with `isAuthPage = true` — the LLM returns no `next_links` and heuristic interactions are skipped.

---

## Per-Page Log Structure

Each page produces N+1 log entries in `session_logs`:

### Section Logs (N entries, one per Top/Mid/Bottom)

```typescript
{
    session_id, step_number, current_url,
    screenshot_url: '/screenshots/sessionId/step_N.jpg',  // or S3 presigned URL
    emotion_tag: 'curiosity',
    inner_monologue: 'The hero section is bold but the CTA is below fold…',
    action_taken: {
        type: 'system',
        info: 'scan_top',                          // scan_top | scan_mid | scan_bottom
        proposed_solution: 'Move CTA above fold',
        specific_emotion: 'curiosity',
        local_screenshot_path: '/screenshots/…'
    }
}
```

### Page Summary Log (1 entry, no screenshot)

```typescript
{
    session_id, step_number, current_url,
    screenshot_url: null,
    emotion_tag: 'curiosity',
    inner_monologue: 'Clean homepage — strong visual hierarchy, fast load.',
    action_taken: {
        type: 'page_summary',
        info: 'page_complete',
        friction_points: ['Value proposition below fold on mobile'],
        positives: ['Fast load time', 'Clear CTA placement'],
        overall_emotion: 'curiosity',
        overall_intensity: 0.72,
        technical_metrics: {
            latency_ms: 1842,
            broken_links_count: 0,
            request_failures: 0
        }
    }
}
```

### Interaction Logs (0–4 entries, one per heuristic click)

```typescript
{
    session_id, step_number,
    current_url: 'https://example.com/',    // page where click happened
    screenshot_url: '/screenshots/…/step_N.jpg',
    emotion_tag: 'neutral',
    inner_monologue: 'Interacted with: "Get Started"',
    action_taken: {
        type: 'click',
        info: 'heuristic_interaction',
        text: 'Get Started',
        coordinates: { x: 960, y: 200, w: 140, h: 48 },  // for heatmap overlay
        navigated_to: 'https://example.com/signup',        // null if no navigation
        local_screenshot_path: '/screenshots/…'
    }
}
```

---

## Screenshot Storage

**Local development** (no `S3_BUCKET_NAME` env var):
```
public/screenshots/{sessionId}/step_{N}.jpg
```
Served by Next.js as `/screenshots/{sessionId}/step_{N}.jpg` from the `public/` directory.

**Production** (`S3_BUCKET_NAME` set):
```
s3://{bucket}/screenshots/{sessionId}/step_{N}.jpg
```
An S3 presigned GET URL (7-day expiry) is stored as `screenshot_url` in the DB. The frontend's `<img src>` reads this URL directly.

**What is NOT stored:** raw base64 in the DB. Screenshots are always saved to disk/S3 first, and only the file path or presigned URL is written to `session_logs.screenshot_url`.

---

## Technical Metrics Collection

`BrowserService` tracks network events via Playwright's context-level `response` and `requestfailed` listeners. Per-page deltas are captured using a snapshot taken at the start of each `navigate()` call:

```typescript
// Snapshot before navigate
this._pageNavSnapshot = {
    brokenLinksCount: this.metrics.broken_links.length,
    requestFailures: this.metrics.request_failures,
};

// After navigate:
getLastPageMetrics() → {
    latency_ms: this.metrics.last_load_time,
    broken_links_count: broken_links.length - snapshot.brokenLinksCount,
    request_failures: request_failures - snapshot.requestFailures
}
```

These are written into the `page_summary` log's `technical_metrics` field. The report generator (`reporter.ts`) aggregates them into `reportData.technicalAudit`:

- **`slowPages`** — pages where `latency_ms > 3000`
- **`brokenLinks`** — pages where `broken_links_count > 0`

The `TechnicalAudit` report component displays these alongside a health score (`100 - issues × 5`).

---

## Crash Recovery

On retry (session attempt > 1), the orchestrator rebuilds the SiteMap from previously logged URLs:

```typescript
const resumeState = attempt > 1 ? await buildResumeState(sessionId) : null;
// → reads all session_logs.current_url for this session
// → seeds SiteMap.visited with those URLs
// → re-enters crawl from the last logged URL
```

---

## Concurrency Control

A module-level semaphore (`semaphore.ts`) limits concurrent browser instances across all sessions running on the same server. `acquireBrowser()` blocks until a slot is free; `releaseBrowser()` is called in the session `finally` block.

---

## Constants

| Constant | Value | Location |
|---|---|---|
| `MAX_PAGES` | 15 | `orchestrator.ts` |
| `MAX_INTERACTIONS` | 4 | `orchestrator.ts` |
| `LINK_HARVEST_MAX` | 20 | `orchestrator.ts` |
| `DB_FLUSH_INTERVAL` | 3 | `orchestrator.ts` |
| `MAX_QUEUE_DEPTH` | 50 | `sitemap.ts` |
| `CONTENT_PATTERN_LIMIT` | 2 | `sitemap.ts` |
| Screenshot JPEG quality (scan) | 40% | `browser.ts` |
| Screenshot JPEG quality (click) | 45% | `browser.ts` |
| Navigate networkidle timeout | 2000ms | `browser.ts` |
| Click post-wait | 600ms | `browser.ts` |

---

## Files

| File | Responsibility |
|---|---|
| `orchestrator.ts` | Session lifecycle, `runCrawl()`, `runInteractions()`, log buffering, screenshot saving |
| `browser.ts` | Playwright/Stagehand wrapper — navigate, `observeFastPage()`, `getHeuristicClicks()`, `clickAtCoords()`, metrics collection |
| `sitemap.ts` | Priority queue, URL normalization, visited-set, content section dedup, journey narrative string |
| `llm.ts` | LLM provider adapters — `analysePage()`, `generateSummary()`, `generatePersonas()` |
| `reporter.ts` | Post-session report synthesis — aggregates all session logs, runs AI synthesis, stores `report_data` |
| `semaphore.ts` | Global browser concurrency limiter |
| `types.ts` | Shared interfaces: `Observation`, `ObservationSection`, `PageAnalysisResult`, `HeuristicMetrics`, `PersonaProfile` |

---

## What Was Proposed But Not Implemented

| Proposal | Why not implemented |
|---|---|
| Per-page browser open/close | Single instance is faster (~90s saved) and simpler |
| Warm instance pool with idle timer | Unnecessary with single-instance approach |
| Pipeline browser + LLM concurrently | Not needed — sequential is fast enough |
| `interactBefore` queue field (stagehand.act) | Replaced by heuristic clicks (no LLM cost) |
| DOM pruning before LLM | observeFastPage skips DOM extraction entirely |
| Nav/footer similarity skip | LLM handles repeated nav gracefully via journey narrative |
| Depth tracking per QueueItem | URL priority score achieves the same goal |
