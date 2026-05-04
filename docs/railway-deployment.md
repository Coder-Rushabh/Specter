# Railway Deployment & BrowserBase Integration

---

## Overview

Specter runs on **Railway** using a Docker-based build. The Next.js app (marketing + dashboard + API routes) runs in a single container. Browser sessions are handled by **BrowserBase** in production — a cloud browser service that removes the need to run Chromium inside the Railway container.

```
User → Railway (Next.js container)
              ↓ session trigger
         API route /api/sessions/[id]/run
              ↓ BrowserService.init()
         BrowserBase cloud Chromium  ←──  BROWSERBASE_API_KEY set
              ↓ screenshots + DOM
         LLM (Gemini / OpenAI / etc.)
              ↓ analysis
         Supabase (logs, screenshots, reports)
```

---

## Dockerfile

```dockerfile
FROM node:20-slim

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Build-time public env vars injected as Docker ARGs
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

RUN pnpm build

ENV NODE_ENV=production

EXPOSE 3000
CMD ["pnpm", "start"]
```

**Why `node:20-slim` and not a Playwright image?**
Because BrowserBase runs the browser in the cloud — no Chromium needs to be installed in the Railway container. The slim Node image keeps the build fast and the container small.

---

## railway.toml

```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

Railway auto-detects the `$PORT` environment variable and Next.js reads it automatically.

---

## Environment Variables

Set these in Railway → your service → **Variables** tab.

### Required (all environments)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key (server-only) |
| `GEMINI_API_KEY` | Default LLM key (Gemini 2.0 Flash) |
| `ENCRYPTION_KEY` | AES-256-CBC key for encrypting user-supplied LLM keys |

### Required for BrowserBase (production)

| Variable | Description |
|---|---|
| `BROWSERBASE_API_KEY` | BrowserBase API key |
| `BROWSERBASE_PROJECT_ID` | BrowserBase project ID |

### Optional

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | For OpenAI provider support |
| `SUPABASE_SCREENSHOTS_BUCKET` | Supabase Storage bucket name for screenshots. If not set, screenshots save locally (not persistent on Railway — ephemeral filesystem) |
| `OLLAMA_HOST` | Ollama server URL (default: `http://localhost:11434`) |
| `OLLAMA_MODELS` | Comma-separated model list (default: `llama3.2-vision`) |

> **Important:** `NEXT_PUBLIC_*` variables are embedded at **build time** by Next.js. They must be set as both Railway Variables AND as **Build-time variables** (Railway dashboard → Service → Variables → Add to Build). The Dockerfile passes them as `ARG`s for this reason.

---

## BrowserBase Integration

### How it works

`BrowserService.init()` in [`src/lib/engine/browser.ts`](../src/lib/engine/browser.ts) checks for `BROWSERBASE_API_KEY` at runtime:

```ts
const useBrowserbase = !!process.env.BROWSERBASE_API_KEY;

const stagehandConfig = useBrowserbase
  ? {
      env: 'BROWSERBASE',
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      verbose: 0,
      disableAPI: true,
      model: { modelName, apiKey: resolvedApiKey },
    }
  : {
      env: 'LOCAL',
      // ... local Chromium config with headless flags
    };
```

- **`BROWSERBASE_API_KEY` set** → Stagehand opens a browser session in BrowserBase's cloud infrastructure. No Chromium in the container needed.
- **`BROWSERBASE_API_KEY` not set** → Stagehand launches a local headless Chromium. This is the dev path and requires Playwright browsers to be installed.

### BrowserBase session lifecycle

Each call to `BrowserService.init()` opens one BrowserBase session. The session is reused across all pages in that test run (the engine navigates within the same session rather than opening a new one per page — saves ~5–7s per page). The session is closed by `BrowserService.close()` at the end of the run.

### BrowserBase limits to be aware of

- Each BrowserBase session has a timeout (default varies by plan). Long test runs (15 pages × ~30s each = ~7.5 min) must stay within this.
- If the session times out mid-run, the orchestrator catches `CDP transport closed` / `socket-close` errors and saves partial results rather than crashing.
- Concurrent sessions are limited by your BrowserBase plan. The `semaphore.ts` module limits concurrent browsers on the Railway side — set `MAX_CONCURRENT_BROWSERS` accordingly.

---

## Local Development (No BrowserBase)

Without `BROWSERBASE_API_KEY`, the engine uses local Chromium via Playwright.

Playwright browsers must be installed:
```bash
npx playwright install chromium
```

Then run normally:
```bash
pnpm dev
```

The Chromium launch flags in `browser.ts` are tuned for headless server environments (`--no-sandbox`, `--disable-gpu`, etc.) and work correctly on both macOS (dev) and Linux (Railway).

---

## Deploying

1. Push to your connected GitHub branch (Railway auto-deploys on push)
2. Or trigger manually: Railway dashboard → **Deploy** button

Railway injects `$PORT` automatically — no changes needed in the app.

### Build-time vs runtime variables

| Variable type | Set in Railway as | When it's read |
|---|---|---|
| `NEXT_PUBLIC_*` | Build variable + Runtime variable | Embedded at `pnpm build` |
| All others | Runtime variable only | Read by Node.js at runtime |

If you change a `NEXT_PUBLIC_*` variable, you must **redeploy** (not just restart) for it to take effect.

---

## Screenshot Storage on Railway

Railway has an **ephemeral filesystem** — files written to disk are lost on redeploy or restart.

- **With `SUPABASE_SCREENSHOTS_BUCKET` set:** Screenshots are uploaded to Supabase Storage and the public URL is stored in `session_logs.screenshot_url`. Persistent.
- **Without it:** Screenshots are saved to `/app/public/screenshots/` inside the container. They will be lost on restart and won't be accessible via a stable URL. Only use this for local dev.

Always set `SUPABASE_SCREENSHOTS_BUCKET` in production.
