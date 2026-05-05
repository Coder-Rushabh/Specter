import { createAdminClient } from '../supabase/admin';
import { BrowserService } from './browser';
import { LLMService } from './llm';
import { PersonaProfile, PageAnalysisResult } from './types';
import { SiteMap } from './sitemap';
import { generateAndStoreReport, checkAndFinalizeTestRun } from './reporter';
import * as fs from 'fs';
import * as path from 'path';
import { decrypt } from '../utils/vault';
import { acquireBrowser, releaseBrowser } from './semaphore';

// Stagehand registers process signal listeners per instance.
// Raise the limit once at module level to suppress false-positive warnings.
process.setMaxListeners(50);

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_PAGES = 10;               // Hard cap on unique pages to visit
const DB_FLUSH_INTERVAL = 3;        // Flush buffered logs every N steps
const LINK_HARVEST_MAX = 20;        // Max links collected from any single page
const MAX_BROWSER_RESTARTS = 3;     // Max BrowserBase session renewals per crawl

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isBrowserTimeoutError(err: any): boolean {
    const msg = (err?.message ?? '').toLowerCase();
    return msg.includes('socket-close')
        || msg.includes('cdp transport')
        || msg.includes('session timed out')
        || msg.includes('session expired')
        || msg.includes('target page, context or browser has been closed')
        || msg.includes('browser has been closed')
        || msg.includes('page was closed')
        || msg.includes('page has been closed')
        || msg.includes('target closed')
        || msg.includes('protocol error')
        || msg.includes('net::err_failed')
        || msg.includes('net::err_aborted')
        || msg.includes('connection closed')
        || msg.includes('connection reset')
        || msg.includes('econnreset')
        || msg.includes('socket hang up')
        || msg.includes('websocket')
        || msg.includes('waitformainloadstate')   // stagehand internal — fires when browserbase kills session
        || msg.includes('waitforloadstate');       // playwright variant
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class Orchestrator {
    private browser: BrowserService;
    private llm!: LLMService;
    private supabase = createAdminClient();
    private channel: any;

    // Step log buffer — flushed in batches to reduce DB round-trips
    private logBuffer: any[] = [];
    private stepNumber = 1;

    // Header/footer fingerprints seen across pages this session.
    // When the same header/footer appears again we skip those slices in the LLM call
    // to avoid re-analyzing identical chrome on every page.
    private seenHeaderFp = new Set<string>();
    private seenFooterFp = new Set<string>();

    constructor() {
        this.browser = new BrowserService();
    }

    // ─── Main entry ───────────────────────────────────────────────────────────

    async runSession(
        sessionId: string,
        url: string,
        persona: PersonaProfile,
        llmConfig?: { provider: 'gemini' | 'openrouter' | 'ollama' | 'openai'; apiKey?: string; modelName?: string }
    ) {
        this.clog(sessionId, `SESSION START | persona: ${persona.name} | url: ${url} | provider: ${llmConfig?.provider ?? 'gemini'} | model: ${llmConfig?.modelName ?? 'default'}`);
        this.channel = this.supabase.channel(`terminal_${sessionId}`).subscribe();

        let testRunId: string | undefined;
        const MAX_RETRIES = 2;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            let browserAcquired = false;
            try {
                // ── 0. Fetch session config ──────────────────────────────────
                await this.log(sessionId, url, 'neutral', `Mission started for ${persona.name}.`, { type: 'system', info: 'session_started' });

                const { data: sessionData, error: sessionError } = await (this.supabase
                    .from('persona_sessions') as any)
                    .select('*, persona_configs(*, projects(*))')
                    .eq('id', sessionId)
                    .single();

                if (sessionError || !sessionData) throw new Error(`Failed to fetch session: ${sessionError?.message}`);

                testRunId = sessionData.test_run_id;
                const executionMode = sessionData.execution_mode || 'autonomous';

                let provider: 'gemini' | 'openrouter' | 'ollama' | 'openai';
                let apiKey: string | undefined;
                let modelName: string | undefined;

                if (llmConfig) {
                    provider = llmConfig.provider;
                    apiKey = llmConfig.apiKey;
                    modelName = llmConfig.modelName;
                } else {
                    const project = sessionData.persona_configs?.projects;
                    provider = project?.llm_provider || 'gemini';
                    modelName = project?.llm_model_name || undefined;
                    if (project?.encrypted_llm_key) {
                        try { apiKey = decrypt(project.encrypted_llm_key); } catch (_) { }
                    }
                }

                this.llm = new LLMService({ provider, apiKey, modelName });

                if (attempt > 1) {
                    await this.log(sessionId, url, 'neutral', 'Recovery restart after crash.', { type: 'system', info: 'session_retry' });
                }

                await (this.supabase.from('persona_sessions') as any).update({
                    status: 'running',
                    started_at: new Date().toISOString(),
                    is_paused: false
                }).eq('id', sessionId);

                this.updateLiveStatus(sessionId, 'Starting crawl...');

                // ── 1. Browser init (once per session, not per page) ─────────
                // Opening Stagehand per-page costs ~5-7 s each (Playwright launch +
                // Gemini connectivity check). We init once and reuse across pages.
                await acquireBrowser();
                browserAcquired = true;
                this.clog(sessionId, 'Browser init start...');
                const browserInitStart = Date.now();
                await this.browser.init('google/gemini-2.0-flash', process.env.GEMINI_API_KEY);
                this.clog(sessionId, `Browser ready in ${Date.now() - browserInitStart}ms`);

                // ── 2. Crawl-Reason-Repeat traversal ────────────────────────
                const resumeState = attempt > 1 ? await this.buildResumeState(sessionId) : null;
                const browserModel = 'google/gemini-2.0-flash';
                const browserApiKey = process.env.GEMINI_API_KEY;
                await this.runCrawl(sessionId, url, persona, browserModel, browserApiKey, resumeState);

                // ── 2. Complete ──────────────────────────────────────────────
                await this.flushLogs();

                await (this.supabase.from('persona_sessions') as any).update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    exit_reason: 'Goals met or page budget exhausted'
                }).eq('id', sessionId);

                await this.log(sessionId, url, 'delight', 'Session completed.', { type: 'system', info: 'session_completed' });
                await this.flushLogs();
                break;

            } catch (err: any) {
                console.error(`Session ${sessionId} attempt ${attempt} failed:`, err.message);
                this.updateLiveStatus(sessionId, `Error: ${err.message}`);

                // Browser-level failure that escaped runCrawl (e.g. during browser.init()
                // itself, or after all MAX_BROWSER_RESTARTS were exhausted inside runCrawl).
                // Treat as partial completion — save whatever data was collected.
                if (isBrowserTimeoutError(err)) {
                    console.log(`Session ${sessionId}: Browserbase timeout — saving partial results.`);
                    await this.flushLogs();
                    await (this.supabase.from('persona_sessions') as any).update({
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        exit_reason: 'Browser session timed out — partial results saved'
                    }).eq('id', sessionId);
                    break;
                }

                const isConfigError = err.message?.includes('model not found')
                    || err.message?.includes('No endpoints found')
                    || err.message?.includes('non-JSON response');

                if (attempt < MAX_RETRIES && !isConfigError) {
                    await this.browser.close().catch(() => { });
                    if (browserAcquired) { releaseBrowser(); browserAcquired = false; }
                    await this.flushLogs();
                    continue;
                }
                await (this.supabase.from('persona_sessions') as any).update({
                    status: 'error',
                    error_message: err.message,
                    completed_at: new Date().toISOString()
                }).eq('id', sessionId);
            } finally {
                await this.browser.close().catch(() => { });
                if (browserAcquired) releaseBrowser();
                await this.flushLogs();
                if (testRunId) await checkAndFinalizeTestRun(testRunId).catch(() => { });
            }
        }
    }


    // ─── Resume state reconstruction ──────────────────────────────────────────

    private async buildResumeState(sessionId: string): Promise<{ visited: Set<string>; resumeUrl: string | null }> {
        const { data: logs } = await (this.supabase
            .from('session_logs') as any)
            .select('current_url, step_number')
            .eq('session_id', sessionId)
            .not('current_url', 'is', null)
            .order('step_number', { ascending: true });

        const visited = new Set<string>(
            (logs || []).map((l: any) => this.normalizeUrl(l.current_url)).filter(Boolean)
        );

        const lastLog = (logs || []).at(-1);
        const resumeUrl = lastLog?.current_url ?? null;

        console.log(`Resume: ${visited.size} pages already done, re-entering at: ${resumeUrl}`);
        return { visited, resumeUrl };
    }

    // ─── Structured console logger ─────────────────────────────────────────────

    private clog(sid: string, msg: string) {
        const ts = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
        console.log(`[${ts}] [${sid.slice(0, 8)}] ${msg}`);
    }

    // ─── Crawl-Reason-Repeat traversal ────────────────────────────────────────
    //
    // Per-page loop:
    //   1. acquireBrowser  → open browser → navigate → observeFullPage → getLinks → close → releaseBrowser
    //   2. LLM reasons over screenshots (no browser held) → returns analysis + next_links
    //   3. Enqueue next_links through SiteMap (filters external, deduplicates, limits content)
    //   4. Repeat until MAX_PAGES reached or queue empty

    private async runCrawl(
        sessionId: string,
        startUrl: string,
        persona: PersonaProfile,
        browserModel: string,
        browserApiKey: string | undefined,
        resume?: { visited: Set<string>; resumeUrl: string | null } | null
    ) {
        const siteMap = new SiteMap(startUrl);

        if (resume?.visited) {
            siteMap.seedVisited(Array.from(resume.visited));
        }

        const seedUrls = resume?.resumeUrl && resume.resumeUrl !== startUrl
            ? [resume.resumeUrl, startUrl]
            : [startUrl];
        siteMap.enqueue(seedUrls);

        const sessionStart = Date.now();
        this.clog(sessionId, `╔══ CRAWL START ══ persona: ${persona.name} ══ target: ${startUrl}`);
        this.clog(sessionId, `║  page budget: ${MAX_PAGES} | seed queue: ${siteMap.queueLength()}`);
        this.clog(sessionId, `║  browser: single instance reused across all pages (no per-page restart)`);

        let browserRestarts = 0;
        let lastGoodCookies: any[] = [];

        while (siteMap.visitedCount() < MAX_PAGES) {
            const pageUrl = siteMap.dequeue();
            if (!pageUrl) {
                this.clog(sessionId, '║  Queue empty — crawl complete.');
                break;
            }

            if (siteMap.hasVisited(pageUrl)) continue;

            const pageIndex = siteMap.visitedCount() + 1;
            const isAuth = SiteMap.isAuthUrl(pageUrl);
            const pageStart = Date.now();

            this.clog(sessionId, `╠══ PAGE ${pageIndex}/${MAX_PAGES} ${'═'.repeat(Math.max(0, 40 - pageUrl.length))}`);
            this.clog(sessionId, `║  URL   : ${pageUrl}`);
            this.clog(sessionId, `║  TYPE  : ${isAuth ? 'AUTH (capture+analyze, no next_links)' : 'regular'}`);
            this.clog(sessionId, `║  QUEUE : ${siteMap.queueLength()} pages waiting`);

            this.updateLiveStatus(sessionId, `Page ${pageIndex}/${MAX_PAGES}: ${pageUrl}`);

            // ── Check session hasn't been abandoned ──────────────────────────
            const { data: latestSession } = await (this.supabase.from('persona_sessions') as any)
                .select('status').eq('id', sessionId).single();
            if (latestSession?.status === 'abandoned' || latestSession?.status === 'completed') {
                this.clog(sessionId, '║  Session abandoned — stopping.');
                return;
            }

            // ── Phase 1a: Navigate + fast capture (no stagehand.observe) ─────
            this.clog(sessionId, '║  ── PHASE 1: BROWSER ─────────────────────────────');

            let observation: Awaited<ReturnType<BrowserService['observeFastPage']>> | null = null;
            let links: string[] = [];
            let pageMetrics = { latency_ms: 0, broken_links_count: 0, request_failures: 0 };
            let browserRestartTriggered = false;

            try {
                const navStart = Date.now();
                await this.browser.navigate(pageUrl);
                pageMetrics = this.browser.getLastPageMetrics();
                this.clog(sessionId, `║    Navigate             +${Date.now() - navStart}ms → ${pageUrl} (load: ${pageMetrics.latency_ms}ms, broken: ${pageMetrics.broken_links_count}, reqFail: ${pageMetrics.request_failures})`);

                // Checkpoint cookies after each successful navigation so we can
                // restore auth state if the browser session is renewed mid-crawl.
                lastGoodCookies = await this.browser.exportCookies().catch(() => []);

                const obsStart = Date.now();
                observation = await this.browser.observeFastPage();
                const sectionCount = observation.sections?.length ?? 0;
                const ssKb = Math.round((observation.screenshot?.length ?? 0) * 0.75 / 1024);
                this.clog(sessionId, `║    observeFastPage      +${Date.now() - obsStart}ms → ${sectionCount} sections, ~${ssKb}kb`);
                this.clog(sessionId, `║    Page title           "${observation.title}"`);

                if (!isAuth) {
                    const linksStart = Date.now();
                    links = await this.browser.getContentLinks(LINK_HARVEST_MAX);
                    this.clog(sessionId, `║    getContentLinks      +${Date.now() - linksStart}ms → ${links.length} links`);
                    if (links.length > 0) links.forEach(l => this.clog(sessionId, `║      · ${l}`));
                }
            } catch (err: any) {
                if (isBrowserTimeoutError(err)) {
                    // ── BrowserBase session expired — renew and retry this page ──
                    browserRestarts++;
                    if (browserRestarts > MAX_BROWSER_RESTARTS) {
                        this.clog(sessionId, `║  ✖ Max browser restarts (${MAX_BROWSER_RESTARTS}) reached — stopping crawl.`);
                        break;
                    }
                    this.clog(sessionId, `║  ⚡ BrowserBase session expired — renewing (${browserRestarts}/${MAX_BROWSER_RESTARTS})...`);
                    await this.browser.close().catch(() => {});
                    // Re-enqueue BEFORE init so the page isn't lost if init fails
                    siteMap.enqueue([pageUrl]);
                    await this.log(sessionId, pageUrl, 'neutral',
                        `Browser session renewed (restart ${browserRestarts}/${MAX_BROWSER_RESTARTS}).`,
                        { type: 'system', info: 'browser_session_renewed' });
                    await this.flushLogs();
                    try {
                        await this.browser.init(browserModel, browserApiKey);
                    } catch (initErr: any) {
                        this.clog(sessionId, `║  ✖ Browser re-init failed: ${initErr.message} — stopping crawl.`);
                        break;
                    }
                    if (lastGoodCookies.length) {
                        await this.browser.restoreCookies(lastGoodCookies).catch(() => {});
                        this.clog(sessionId, `║    Cookies restored (${lastGoodCookies.length} entries)`);
                    }
                    browserRestartTriggered = true;
                } else {
                    // Log the full error message so we can expand isBrowserTimeoutError if needed
                    this.clog(sessionId, `║    ✖ Capture FAILED (non-timeout): ${err.message}`);
                }
            }

            if (browserRestartTriggered) continue;

            if (!observation || !observation.url) {
                this.clog(sessionId, `║  ✖ Skipping — no observation captured`);
                siteMap.markVisited(pageUrl, isAuth);
                continue;
            }

            siteMap.markVisited(pageUrl, isAuth);

            if (!observation.sections || observation.sections.length === 0) {
                this.clog(sessionId, `║  ✖ Skipping — no page sections in observation`);
                await this.flushLogs();
                continue;
            }

            // ── Phase 1b: Heuristic interactions for heatmap data ────────────
            // Rule-based clicks (no LLM) — CTAs, nav links, buttons visible in
            // the viewport. Coordinates logged to DB → frontend heatmap overlay.
            // If a click navigates away, the destination URL is enqueued and we
            // return to the current page to finish the interaction set.
            if (!isAuth) {
                await this.runInteractions(sessionId, pageUrl, siteMap).catch((err: any) => {
                    // Interactions are best-effort — a browser timeout here skips the
                    // interaction set but doesn't abort the page (LLM phase still runs).
                    if (!isBrowserTimeoutError(err)) throw err;
                    this.clog(sessionId, `║    ⚡ Browser timeout during interactions — skipping interaction set`);
                });
                // Return to the page we were analysing after interactions
                const currentUrl = this.browser.getCurrentUrl();
                if (this.normalizeUrl(currentUrl) !== this.normalizeUrl(pageUrl)) {
                    await this.browser.navigate(pageUrl).catch(() => {});
                }
            }

            // ── Header / footer dedup ────────────────────────────────────────
            // Fingerprint this page's header+footer and compare to previously seen pages.
            // Slices whose chrome (header/footer) is identical to a prior page are marked
            // so the LLM skips them — prevents re-analyzing the same nav on every page.
            const { header: hFp, footer: fFp } = await this.browser.fingerprintHeaderFooter();
            const headerSeen = hFp && this.seenHeaderFp.has(hFp);
            const footerSeen = fFp && this.seenFooterFp.has(fFp);
            if (hFp) this.seenHeaderFp.add(hFp);
            if (fFp) this.seenFooterFp.add(fFp);

            // Filter: remove Slice-1 if header already seen, remove last slice if footer already seen
            const allSections = observation.sections;
            const sectionsForLLM = allSections.filter((_s, i) => {
                if (i === 0 && headerSeen) return false;
                if (i === allSections.length - 1 && footerSeen) return false;
                return true;
            });
            // If all slices were filtered (e.g. single-slice page with seen header+footer)
            // keep at least one so the LLM can still analyze the page
            const llmSections = sectionsForLLM.length > 0 ? sectionsForLLM : allSections;

            if (headerSeen || footerSeen) {
                this.clog(sessionId, `║    Chrome dedup: header=${headerSeen ? 'skip' : 'new'}, footer=${footerSeen ? 'skip' : 'new'} → ${llmSections.length}/${allSections.length} slices to LLM`);
            }

            // ── Phase 2: LLM reasoning ───────────────────────────────────────
            this.clog(sessionId, '║  ── PHASE 2: LLM REASONING ───────────────────────');
            this.clog(sessionId, `║    Sections: ${llmSections.map(s => s.label).join(', ')}`);
            this.clog(sessionId, `║    Journey : ${siteMap.journeyNarrative.slice(0, 100) || '(start)'}`);

            this.updateLiveStatus(sessionId, `Analysing page ${pageIndex}: ${pageUrl}`);
            const llmStart = Date.now();

            // Auth pages: use the simpler analyzePageSections() — no next_links complexity,
            // less likely to fail, still gives full section-level UX feedback on the design.
            // Regular pages: use the full analysePage() with navigation intent.
            let analysis: PageAnalysisResult | null = null;

            if (isAuth) {
                const authScan = await this.llm.analyzePageSections(
                    llmSections,
                    observation.url,
                    observation.title,
                    persona
                ).catch((err: any) => {
                    this.clog(sessionId, `║    ✖ AUTH LLM FAILED: ${err?.message}`);
                    return null;
                });
                if (authScan) {
                    analysis = {
                        ...authScan,
                        friction_points: [],
                        positives: [],
                        next_links: [],
                        journey_narrative_update: ''
                    };
                }
            } else {
                analysis = await this.llm.analysePage(
                    llmSections,
                    observation.url,
                    observation.title,
                    persona,
                    false,
                    links,
                    siteMap.journeyNarrative
                ).catch((err: any) => {
                    this.clog(sessionId, `║    ✖ LLM FAILED: ${err?.message}`);
                    return null;
                });
            }

            if (!analysis) { await this.flushLogs(); continue; }

            this.clog(sessionId, `║    LLM done             +${Date.now() - llmStart}ms`);
            this.clog(sessionId, `║    Emotion  : ${analysis.overall_emotion} (${analysis.overall_intensity.toFixed(2)})`);
            this.clog(sessionId, `║    Summary  : ${analysis.page_summary}`);

            if (analysis.friction_points.length > 0) {
                this.clog(sessionId, `║    Friction (${analysis.friction_points.length}):`);
                analysis.friction_points.forEach(f => this.clog(sessionId, `║      ✗ ${f}`));
            }
            if (analysis.positives.length > 0) {
                this.clog(sessionId, `║    Positives (${analysis.positives.length}):`);
                analysis.positives.forEach(p => this.clog(sessionId, `║      ✓ ${p}`));
            }
            if (analysis.next_links.length > 0) {
                this.clog(sessionId, `║    Next links (${analysis.next_links.length}):`);
                analysis.next_links.forEach(l => this.clog(sessionId, `║      → ${l}`));
            }

            if (analysis.journey_narrative_update) {
                const sep = siteMap.journeyNarrative ? ' ' : '';
                siteMap.journeyNarrative += sep + analysis.journey_narrative_update;
                this.clog(sessionId, `║    Narrative: "${analysis.journey_narrative_update}"`);
            }

            // ── DB log: one entry per section (sequential step numbers) ─────────
            // Each section gets its own step so the live view shows per-section feedback.
            // Page-level data (friction_points, positives, summary) is attached to the
            // last section so the frontend has it without a separate page_summary step.
            for (let i = 0; i < analysis.sections.length; i++) {
                const sectionResult = analysis.sections[i];
                // Match screenshot from allSections (not llmSections — we want the original capture)
                const matchedSection = allSections.find(s => s.label === sectionResult.label)
                    ?? allSections[i]
                    ?? allSections[0];
                const localPath = await this.saveScreenshot(sessionId, this.stepNumber, matchedSection.screenshot);
                const isLast = i === analysis.sections.length - 1;
                this.log(
                    sessionId,
                    observation.url,
                    this.mapEmotion(sectionResult.emotional_state),
                    sectionResult.ux_feedback,
                    {
                        type: 'page_section',
                        info: isAuth ? 'auth_section' : `section_${sectionResult.label ?? i + 1}`,
                        label: sectionResult.label,
                        proposed_solution: sectionResult.proposed_solution ?? null,
                        specific_emotion: sectionResult.emotional_state,
                        // Page-level summary on last section so frontend has full context
                        ...(isLast ? {
                            page_summary: analysis.page_summary,
                            friction_points: analysis.friction_points,
                            positives: analysis.positives,
                            overall_emotion: analysis.overall_emotion,
                            overall_intensity: analysis.overall_intensity,
                            technical_metrics: pageMetrics,
                        } : {}),
                        local_screenshot_path: localPath
                    },
                    localPath
                );
                this.stepNumber++;
            }

            // ── Enqueue next links ────────────────────────────────────────────
            // Validate LLM-suggested links against DOM-harvested links to prevent
            // hallucinated URLs (e.g. /subscribe that doesn't exist) from being visited.
            if (!isAuth) {
                const harvestedNorm = new Set(links.map(l => this.normalizeUrl(l)));
                const validNextLinks = analysis.next_links.filter(l =>
                    harvestedNorm.has(this.normalizeUrl(l))
                );
                if (analysis.next_links.length !== validNextLinks.length) {
                    const dropped = analysis.next_links.filter(l => !harvestedNorm.has(this.normalizeUrl(l)));
                    this.clog(sessionId, `║    ⚠ Dropped ${dropped.length} hallucinated link(s): ${dropped.join(', ')}`);
                }
                siteMap.enqueue(validNextLinks.length > 0
                    ? [...validNextLinks, ...links]
                    : links
                );
            }

            const pageTotal = Date.now() - pageStart;
            this.clog(sessionId, `╠══ PAGE ${pageIndex} DONE ══ ${pageTotal}ms ══ queue: ${siteMap.queueLength()} ══ visited: ${siteMap.visitedCount()}/${MAX_PAGES}`);

            await this.flushLogs();
        }

        const sessionTotal = Date.now() - sessionStart;
        this.clog(sessionId, `╚══ CRAWL DONE ══ ${siteMap.visitedCount()} pages ══ total: ${(sessionTotal / 1000).toFixed(1)}s`);
        await this.flushLogs();
    }

    // ─── Heuristic interaction loop ───────────────────────────────────────────
    //
    // After observeFastPage, click up to MAX_INTERACTIONS visible CTAs/nav/buttons
    // using pure Playwright (no LLM). Records click coords for the heatmap.
    // If a click navigates away: enqueue destination → return to original page.

    private readonly MAX_INTERACTIONS = 4;

    private async runInteractions(
        sessionId: string,
        pageUrl: string,
        siteMap: SiteMap
    ): Promise<void> {
        const elements = await this.browser.getHeuristicClicks(this.MAX_INTERACTIONS);
        if (elements.length === 0) return;

        this.clog(sessionId, `║  ── INTERACTIONS (${elements.length} targets) ──────────────────`);

        let done = 0;
        for (const el of elements) {
            if (done >= this.MAX_INTERACTIONS) break;

            this.clog(sessionId, `║    Click #${done + 1}: "${el.text}" at (${el.x}, ${el.y})`);

            try {
                const { newUrl, screenshot } = await this.browser.clickAtCoords(el.x, el.y);
                const navigated = this.normalizeUrl(newUrl) !== this.normalizeUrl(pageUrl);

                const localPath = await this.saveScreenshot(sessionId, this.stepNumber, screenshot);
                this.log(
                    sessionId,
                    pageUrl,
                    'neutral',
                    `Interacted with: "${el.text}"`,
                    {
                        type: 'click',
                        info: 'heuristic_interaction',
                        text: el.text,
                        // coordinates stored for heatmap overlay
                        coordinates: { x: el.x, y: el.y, w: el.w, h: el.h },
                        navigated_to: navigated ? newUrl : null,
                        local_screenshot_path: localPath
                    },
                    localPath  // store file path as screenshot_url, not raw base64
                );
                this.stepNumber++;
                done++;

                if (navigated) {
                    this.clog(sessionId, `║      → Navigated to ${newUrl} — enqueuing, returning to ${pageUrl}`);
                    if (!siteMap.hasVisited(newUrl)) siteMap.enqueue([newUrl]);
                    await this.browser.navigate(pageUrl);
                }
            } catch (err: any) {
                if (isBrowserTimeoutError(err)) throw err; // propagate — browser is dead
                this.clog(sessionId, `║      ✖ Click failed: ${err.message}`);
            }
        }

        this.clog(sessionId, `║    ${done} interactions logged`);
    }

    // ─── Log buffer ───────────────────────────────────────────────────────────

    private log(
        sessionId: string,
        url: string,
        emotion: string,
        monologue: string,
        action: any,
        screenshotUrl?: string   // file path (/screenshots/…) or S3 presigned URL — NOT raw base64
    ) {
        this.logBuffer.push({
            session_id: sessionId,
            step_number: this.stepNumber,
            current_url: url,
            screenshot_url: screenshotUrl || null,
            emotion_tag: emotion,
            inner_monologue: monologue,
            action_taken: action
        });
    }

    private async flushLogs() {
        if (this.logBuffer.length === 0) return;
        const batch = [...this.logBuffer];
        this.logBuffer = [];
        try {
            const { error } = await (this.supabase.from('session_logs') as any).insert(batch);
            if (error) console.error('Log flush error:', error.message);
        } catch (err: any) {
            console.error('Log flush exception:', err.message);
        }
    }

    // ─── Screenshot persistence ───────────────────────────────────────────────

    private async saveScreenshot(sessionId: string, step: number | string, base64: string): Promise<string> {
        if (!base64) return '';
        const file = `step_${step}.jpg`;
        const storagePath = `${sessionId}/${file}`;
        const bucket = process.env.SUPABASE_SCREENSHOTS_BUCKET;
        const sizeKb = Math.round(base64.length * 0.75 / 1024);

        // ── Supabase Storage (production) ────────────────────────────────────────
        if (bucket) {
            this.clog(sessionId, `║  📤 Uploading screenshot → bucket: ${bucket} | path: ${storagePath} | size: ~${sizeKb}kb`);
            const uploadStart = Date.now();
            try {
                // Convert base64 → ArrayBuffer (more reliable than passing Buffer
                // directly through Supabase's fetch-based client in Node.js)
                const binary = Buffer.from(base64, 'base64');
                const arrayBuffer = binary.buffer.slice(
                    binary.byteOffset,
                    binary.byteOffset + binary.byteLength
                );

                const { error } = await this.supabase.storage
                    .from(bucket)
                    .upload(storagePath, arrayBuffer, {
                        contentType: 'image/jpeg',
                        upsert: true,
                    });

                if (error) {
                    this.clog(sessionId, `║  ✖ Upload failed [${storagePath}]: ${error.message} (status: ${(error as any).statusCode})`);
                    throw error;
                }

                const { data } = this.supabase.storage.from(bucket).getPublicUrl(storagePath);
                this.clog(sessionId, `║  ✔ Screenshot stored +${Date.now() - uploadStart}ms → ${data.publicUrl}`);
                return data.publicUrl;
            } catch (err: any) {
                this.clog(sessionId, `║  ✖ Supabase Storage failed for ${storagePath}: ${err.message} — falling back to local`);
            }
        } else {
            this.clog(sessionId, `║  ⚠ SUPABASE_SCREENSHOTS_BUCKET not set — saving screenshot locally`);
        }

        // ── Local storage (dev / bucket not configured / upload failed) ──────────
        try {
            const dir = path.join(process.cwd(), 'public', 'screenshots', sessionId);
            fs.mkdirSync(dir, { recursive: true });
            const localPath = `/screenshots/${sessionId}/${file}`;
            fs.writeFileSync(path.join(dir, file), Buffer.from(base64, 'base64'));
            this.clog(sessionId, `║  💾 Screenshot saved locally → ${localPath} (~${sizeKb}kb)`);
            return localPath;
        } catch (err: any) {
            this.clog(sessionId, `║  ✖ Local screenshot save failed for ${storagePath}: ${err.message}`);
            return '';
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private updateLiveStatus(sessionId: string, status: string) {
        console.log(`[${sessionId.slice(0, 8)}] ${status}`);
        
        // 1. Existing DB update
        void (this.supabase.from('persona_sessions') as any)
            .update({ live_status: status }).eq('id', sessionId);

        // 2. Broadcast live diagnostics (no DB load)
        if (this.channel) {
            void this.channel.send({
                type: 'broadcast',
                event: 'log',
                payload: { message: status, timestamp: new Date().toISOString() }
            });
        }
    }

    private mapEmotion(state: string): string {
        const s = (state || 'neutral').toLowerCase();
        if (s.includes('frustrat') || s.includes('angry')) return 'frustration';
        if (s.includes('disappoint') || s.includes('fail')) return 'disappointment';
        if (s.includes('confus') || s.includes('lost')) return 'confusion';
        if (s.includes('bore') || s.includes('slow')) return 'boredom';
        if (s.includes('happy') || s.includes('delight')) return 'delight';
        if (s.includes('satisf') || s.includes('good')) return 'satisfaction';
        if (s.includes('curio') || s.includes('interest')) return 'curiosity';
        return 'neutral';
    }

    private normalizeUrl(url: string): string {
        try {
            const u = new URL(url);
            const host = u.hostname.replace(/^www\./, '');
            let p = u.pathname;
            if (p !== '/' && p.endsWith('/')) p = p.slice(0, -1);
            return `${u.protocol}//${host}${p}`.toLowerCase();
        } catch {
            return url.toLowerCase().split('?')[0].split('#')[0].replace(/\/$/, '');
        }
    }
}