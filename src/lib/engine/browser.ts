import { Stagehand } from '@browserbasehq/stagehand';
import { Observation, ObservationSection, HeuristicMetrics, Action } from './types';

function isCDPTimeout(err: any): boolean {
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
        || msg.includes('waitformainloadstate')
        || msg.includes('waitforloadstate');
}


export class BrowserService {
    private stagehand: Stagehand | null = null;
    private page: any = null;
    private metrics: HeuristicMetrics = {
        broken_links: [],
        navigation_latency: [],
        request_failures: 0,
        action_latency: [],
        last_load_time: 0
    };
    // Snapshot taken at the start of each navigate() call so we can report
    // per-page deltas (broken links, request failures) rather than session totals.
    private _pageNavSnapshot = { brokenLinksCount: 0, requestFailures: 0 };

    // ─── Init ───────────────────────────────────────────────────────────────────

    async init(modelName: string = 'google/gemini-2.0-flash', apiKey?: string) {
        try {
            const isGemini = modelName.includes('gemini');
            const resolvedApiKey = isGemini
                ? (apiKey || process.env.GEMINI_API_KEY)
                : (apiKey || process.env.OPENAI_API_KEY);

            const useBrowserbase = !!process.env.BROWSERBASE_API_KEY;

            const stagehandConfig: any = useBrowserbase
                // ── Browserbase (Railway / production) ──────────────────────────────
                // Browser runs in Browserbase cloud — no local Chromium needed.
                // BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID must be set.
                ? {
                    env: 'BROWSERBASE',
                    apiKey: process.env.BROWSERBASE_API_KEY,
                    projectId: process.env.BROWSERBASE_PROJECT_ID,
                    verbose: 0,
                    disableAPI: true,
                    model: { modelName, apiKey: resolvedApiKey },
                }
                // ── Local Chromium (dev / no Browserbase configured) ─────────────────
                : {
                    env: 'LOCAL',
                    verbose: 0,
                    disableAPI: true,
                    model: { modelName, apiKey: resolvedApiKey },
                    localBrowserLaunchOptions: {
                        headless: true,
                        viewport: { width: 1280, height: 800 },
                        args: [
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            '--disable-dev-shm-usage',
                            '--disable-gpu',
                            '--disable-extensions',
                            '--disable-plugins',
                            '--disable-background-networking',
                            '--disable-background-timer-throttling',
                            '--disable-sync',
                            '--disable-translate',
                            '--disable-default-apps',
                            '--disable-notifications',
                            '--disable-hang-monitor',
                            '--no-first-run',
                            '--mute-audio',
                            '--disable-component-update',
                        ]
                    }
                };

            console.log(`Initializing Stagehand (${useBrowserbase ? 'Browserbase' : 'local Chromium'})...`);
            this.stagehand = new Stagehand(stagehandConfig);
            await this.stagehand.init();
            await this.setupPage();
            console.log('Stagehand ready.');
        } catch (err: any) {
            console.error('Stagehand init failed:', err.message);
            throw err;
        }
    }

    // ─── Page setup ─────────────────────────────────────────────────────────────

    private async setupPage(): Promise<void> {
        const context = (this.stagehand as any).context;
        if (!context) throw new Error('Stagehand failure: Context not found after init.');

        const allPages = context.pages ? context.pages() : [];
        this.page = (context.activePage ? context.activePage() : null) || allPages[0];

        if (!this.page) {
            console.log('Forcing newPage()...');
            this.page = await context.newPage();
        }

        const pwContext = this.page?.context ? this.page.context() : context;
        if (pwContext && typeof pwContext.on === 'function') {
            this.attachNetworkListeners(pwContext);
            pwContext.on('page', async (newPage: any) => {
                console.log(`New tab: ${newPage.url()}. Switching...`);
                this.page = newPage;
                await newPage.bringToFront().catch(() => { });
                await newPage.setViewportSize?.({ width: 1280, height: 800 }).catch(() => { });
            });
        }

        if (!this.page) throw new Error('Stagehand failure: Page object not found.');
        await this.page.setViewportSize?.({ width: 1280, height: 800 }).catch(() => { });

        // Auto-dismiss browser-level dialogs (notification prompts, alerts, confirms).
        // Stagehand wraps Playwright's page and doesn't proxy all events — use the
        // underlying Playwright page (_page) if available, fall back gracefully.
        try {
            const rawPage = (this.page as any)._page ?? this.page;
            rawPage.on('dialog', (dialog: any) => dialog.dismiss().catch(() => { }));
        } catch (_) { }
    }

    // ─── Network ────────────────────────────────────────────────────────────────

    private attachNetworkListeners(target: any) {
        if (!target || typeof target.on !== 'function') return;
        try {
            target.on('response', (response: any) => {
                try {
                    const status = typeof response.status === 'function' ? response.status() : 0;
                    if (status >= 400) {
                        const url = typeof response.url === 'function' ? response.url() : 'unknown';
                        if (!this.metrics.broken_links.includes(url)) {
                            this.metrics.broken_links.push(`${status}: ${url}`);
                        }
                    }
                } catch (_) { }
            });
            target.on('requestfailed', (request: any) => {
                this.metrics.request_failures++;
                try {
                    const url = typeof request.url === 'function' ? request.url() : 'unknown';
                    const err = typeof request.failure === 'function' ? request.failure()?.errorText : 'unknown';
                    console.warn(`Request failed: ${url} — ${err}`);
                } catch (_) { }
            });
        } catch (_) { }
    }

    // ─── Navigation ─────────────────────────────────────────────────────────────

    async navigate(url: string) {
        if (!this.page) return;
        this._pageNavSnapshot = {
            brokenLinksCount: this.metrics.broken_links.length,
            requestFailures: this.metrics.request_failures,
        };
        const start = Date.now();
        try {
            await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Round 1: wait for initial page resources (JS bundle, CSS, fonts)
            await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => { });

            // Gap: React/Vue/Angular fire useEffect / componentDidMount here.
            // These trigger API calls (videos, feeds, user data) that start AFTER
            // the first networkidle — giving them time to actually fire.
            await this.page.waitForTimeout(600);

            // Round 2: wait for those lazy API requests to finish
            await this.page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => { });

            // Final check: page must have real visible content, no spinners/skeletons
            await this.waitForContent();

            const duration = Date.now() - start;
            this.metrics.navigation_latency.push(duration);
            this.metrics.last_load_time = duration;
        } catch (err: any) {
            if (isCDPTimeout(err)) throw err; // let orchestrator handle browser restart
            console.error(`Navigation to ${url} failed:`, err.message);
        }
    }

    /**
     * Waits until the page has meaningful visible content before we screenshot.
     * Handles three common cases:
     *   1. SPA hydration — React/Next.js pages are empty until JS runs
     *   2. Skeleton/spinner loaders — visible loading indicators still present
     *   3. Lazy-loaded sections — content streams in after initial paint
     *
     * Strategy: poll every 300ms for up to 8s checking:
     *   - document.readyState === 'complete'
     *   - visible text length > 100 chars (not a blank shell)
     *   - no active loading indicators (spinners, skeletons, progress bars)
     * Falls through silently if timeout reached — better a slightly early screenshot
     * than hanging forever on a broken page.
     */
    private async waitForContent(timeoutMs = 8000): Promise<void> {
        if (!this.page) return;
        const deadline = Date.now() + timeoutMs;
        const POLL = 300;

        while (Date.now() < deadline) {
            const ready = await this.page.evaluate(() => {
                // 1. DOM must be fully parsed
                if (document.readyState !== 'complete') return false;

                // 2. Must have meaningful visible text (not just a blank shell or error page)
                const text = (document.body?.innerText || '').trim();
                if (text.length < 100) return false;

                // 3. No active loading indicators visible in the DOM
                const loadingSelectors = [
                    '[class*="skeleton"]',
                    '[class*="shimmer"]',
                    '[class*="spinner"]',
                    '[class*="loading"]',
                    '[aria-label*="loading" i]',
                    '[aria-busy="true"]',
                    'progress',
                ].join(',');
                if (document.querySelector(loadingSelectors)) return false;

                // 4. No API-pending empty-state placeholders
                // These appear when the container renders before the data fetch completes
                const PENDING_PATTERNS = /^(no (videos?|posts?|items?|results?|data|content) found\.?|loading\.\.\.|please wait|fetching|coming soon\.?)$/i;
                const allText = Array.from(document.querySelectorAll('p, span, div, h2, h3'));
                const hasPendingPlaceholder = allText.some(el => {
                    if ((el as HTMLElement).children.length > 0) return false; // skip containers
                    return PENDING_PATTERNS.test(((el as HTMLElement).innerText || '').trim());
                });
                if (hasPendingPlaceholder) return false;

                return true;
            }).catch(() => false);

            if (ready) return;
            await this.page.waitForTimeout(POLL);
        }
        // Timeout reached — proceed anyway (broken page or genuinely empty content)
    }

    /**
     * Returns technical metrics for the most-recently navigated page:
     *   latency_ms          – time to DOMContentLoaded for this page
     *   broken_links_count  – 4xx/5xx responses captured during this page load
     *   request_failures    – network-level failures during this page load
     * Uses deltas from the snapshot taken at the start of navigate() so values
     * are per-page, not cumulative across the whole session.
     */
    getLastPageMetrics(): { latency_ms: number; broken_links_count: number; request_failures: number } {
        return {
            latency_ms: this.metrics.last_load_time,
            broken_links_count: this.metrics.broken_links.length - this._pageNavSnapshot.brokenLinksCount,
            request_failures: this.metrics.request_failures - this._pageNavSnapshot.requestFailures,
        };
    }

    // ─── DOM extraction ─────────────────────────────────────────────────────────

    /**
     * Fast DOM extraction using pure Playwright page.evaluate() — no stagehand.observe().
     * Queries all interactive elements across the full page (not just viewport).
     * ~100-200ms vs ~3-5s for stagehand.observe(). Max 60 elements.
     */
    private async extractDOMFast(): Promise<any[]> {
        if (!this.page) return [];
        try {
            return await this.page.evaluate(() => {
                const SELECTORS = 'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="tab"], [role="menuitem"]';
                const seen = new Set<string>();
                const result: any[] = [];
                for (const el of Array.from(document.querySelectorAll(SELECTORS))) {
                    if (result.length >= 60) break;
                    const rect = el.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) continue;
                    const tag = el.tagName.toLowerCase();
                    const role = el.getAttribute('role') || tag;
                    const text = (
                        (el as HTMLElement).innerText ||
                        (el as HTMLInputElement).placeholder ||
                        el.getAttribute('aria-label') || ''
                    ).trim().slice(0, 80);
                    if (!text || text.length < 2) continue;
                    const key = `${role}::${text}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    let selector = tag;
                    if ((el as HTMLElement).id) {
                        selector = `#${(el as HTMLElement).id}`;
                    } else if (el.className && typeof el.className === 'string') {
                        const cls = el.className.trim().split(/\s+/).slice(0, 2).join('.');
                        if (cls) selector = `${tag}.${cls}`;
                    }
                    result.push({
                        index: result.length,
                        role,
                        text,
                        selector,
                        coordinates: {
                            x: Math.round(rect.left + window.scrollX),
                            y: Math.round(rect.top + window.scrollY),
                            w: Math.round(rect.width),
                            h: Math.round(rect.height)
                        }
                    });
                }
                return result;
            });
        } catch {
            return [];
        }
    }

    // ─── Capture a single viewport slice ────────────────────────────────────────

    private async captureSlice(label: string): Promise<ObservationSection> {
        if (!this.page) throw new Error('Browser not initialized');
        await this.page.waitForTimeout(50);
        const scrollY = await this.page.evaluate(() => window.scrollY).catch(() => 0);
        const screenshot = await this.page.screenshot({ type: 'jpeg', quality: 45 });
        return {
            screenshot: screenshot.toString('base64'),
            domContext: '[]',
            label,
            scrollY
        };
    }

    // ─── Full-page scan: dynamic N-slice coverage ───────────────────────────────

    async observeFullPage(): Promise<Observation> {
        if (!this.page || !this.stagehand) return this.emptyObservation();
        return this._observeFullPage().catch((err: any) => {
            if (isCDPTimeout(err)) throw err;
            return this.emptyObservation();
        });
    }

    private async _observeFullPage(): Promise<Observation> {
        if (!this.page || !this.stagehand) return this.emptyObservation();
        return this._captureAllSlices();
    }

    // ─── Popup / overlay dismissal ──────────────────────────────────────────────

    /**
     * Attempts to dismiss DOM-level popups between page slices.
     * Called AFTER Slice-1 so the LLM still sees the popup as UX data on the first
     * screenshot, but remaining slices show the actual page content underneath.
     *
     * Handles in order:
     *   1. Escape key — closes most modals natively
     *   2. Click common close / accept buttons (cookie banners, modals, overlays)
     *   3. Force-hide any remaining fixed/sticky overlay that matches popup patterns
     */
    private async dismissPopups(): Promise<void> {
        if (!this.page) return;
        try {
            // 1. Escape closes most modal dialogs without side effects
            await this.page.keyboard.press('Escape').catch(() => { });
            await this.page.waitForTimeout(150);

            // 2. Click the first visible dismiss / accept button we can find
            const DISMISS_SELECTORS = [
                // Generic close buttons
                '[aria-label="Close" i]',
                '[aria-label="Dismiss" i]',
                '[aria-label="close dialog" i]',
                'button[class*="close" i]',
                'button[class*="dismiss" i]',
                '[data-dismiss]',
                '[data-testid*="close" i]',
                // Cookie / GDPR banners — prefer "decline" to avoid consent side-effects
                'button[id*="onetrust-accept" i]',
                'button[class*="cookie-accept" i]',
                'button[class*="accept-cookie" i]',
                '[class*="cookie-banner"] button',
                '[id*="cookiebanner"] button',
                '[class*="gdpr"] button',
                '[id*="gdpr"] button',
                '[class*="consent"] button',
                '[id*="consent-banner"] button',
                // Chat / support widgets
                '[id*="intercom"] [aria-label*="close" i]',
                '[class*="intercom-"] [aria-label*="close" i]',
                // Generic modal/overlay patterns
                '[role="dialog"] button[aria-label*="close" i]',
                '[class*="modal"] [class*="close"]',
                '[class*="overlay"] [class*="close"]',
                '[class*="popup"] [class*="close"]',
            ];

            for (const sel of DISMISS_SELECTORS) {
                try {
                    const el = await this.page.$(sel);
                    if (!el) continue;
                    const box = await el.boundingBox().catch(() => null);
                    if (!box || box.width === 0 || box.height === 0) continue;
                    await el.click({ timeout: 800 }).catch(() => { });
                    await this.page.waitForTimeout(200);
                    break;
                } catch (_) { }
            }

            // 3. If a blocking fixed/sticky overlay is still visible, hide it via JS.
            //    This catches custom popups that don't use standard close-button patterns.
            await this.page.evaluate(() => {
                const POPUP_KEYWORDS = ['modal', 'overlay', 'popup', 'cookie', 'consent', 'banner', 'gdpr', 'newsletter', 'subscribe'];
                for (const el of Array.from(document.querySelectorAll('*'))) {
                    const style = window.getComputedStyle(el as HTMLElement);
                    if (style.position !== 'fixed' && style.position !== 'sticky') continue;
                    const rect = (el as HTMLElement).getBoundingClientRect();
                    // Must cover a significant chunk of the viewport to count as blocking
                    if (rect.width < window.innerWidth * 0.25 || rect.height < 60) continue;
                    const cls = ((el as HTMLElement).className || '').toLowerCase();
                    const id = ((el as HTMLElement).id || '').toLowerCase();
                    if (POPUP_KEYWORDS.some(k => cls.includes(k) || id.includes(k))) {
                        (el as HTMLElement).style.display = 'none';
                    }
                }
            }).catch(() => { });

        } catch (_) { }
    }

    // ─── Header / footer fingerprinting ─────────────────────────────────────────

    /**
     * Returns a short string fingerprint of the page's header and footer HTML.
     * Used by the orchestrator to skip re-analysis of identical chrome across pages.
     * Hashes the outerHTML of <header>/<footer> (or first/last landmark elements).
     */
    async fingerprintHeaderFooter(): Promise<{ header: string; footer: string }> {
        if (!this.page) return { header: '', footer: '' };
        return this.page.evaluate(() => {
            function fingerprint(el: Element | null): string {
                if (!el) return '';
                const html = el.innerHTML.replace(/\s+/g, ' ').trim().slice(0, 800);
                // Simple djb2 hash
                let h = 5381;
                for (let i = 0; i < html.length; i++) h = ((h << 5) + h) ^ html.charCodeAt(i);
                return (h >>> 0).toString(36);
            }
            const header = document.querySelector('header, [role="banner"], nav:first-of-type');
            const footer = document.querySelector('footer, [role="contentinfo"]');
            return { header: fingerprint(header), footer: fingerprint(footer) };
        }).catch(() => ({ header: '', footer: '' }));
    }

    // ─── Shared: dynamic N-slice full-page capture + fast DOM ───────────────────

    private async _captureAllSlices(): Promise<Observation> {
        if (!this.page) return this.emptyObservation();

        // Ensure content is ready before we start snapping (guards post-click captures too)
        await this.waitForContent(2000);

        await this.page.evaluate(() => window.scrollTo(0, 0));
        await this.page.waitForTimeout(50);

        const { vh, dh } = await this.page.evaluate(() => ({
            vh: window.innerHeight,
            dh: document.documentElement.scrollHeight
        }));

        // One screenshot per viewport height, capped at 5 to keep phase 1 under ~10s
        const sliceCount = Math.min(5, Math.ceil(dh / vh));
        const sections: ObservationSection[] = [];

        for (let i = 0; i < sliceCount; i++) {
            await this.page.evaluate((y: number) => window.scrollTo(0, y), i * vh);
            await this.page.waitForTimeout(80);
            sections.push(await this.captureSlice(`Slice-${i + 1}`));

            // After capturing Slice-1, try to dismiss any popup/overlay.
            // Slice-1 already has the popup visible (real UX data for the LLM).
            // Subsequent slices should show the actual page content underneath.
            if (i === 0 && sliceCount > 1) {
                await this.dismissPopups();
            }
        }

        // Return to top and extract full DOM once (~100ms, no stagehand)
        await this.page.evaluate(() => window.scrollTo(0, 0));
        await this.page.waitForTimeout(50);
        const dom = await this.extractDOMFast();
        const domStr = JSON.stringify(dom);

        // Attach DOM to first slice — LLM uses it for click/navigation reasoning
        if (sections.length > 0) {
            sections[0] = { ...sections[0], domContext: domStr };
        }

        return {
            screenshot: sections[0]?.screenshot ?? '',
            domContext: domStr,
            url: this.page.url(),
            title: await this.page.title(),
            dimensions: { width: 1280, height: 800 },
            sections
        };
    }

    // ─── Light observe: current viewport only (post-action checks) ──────────────

    async observe(): Promise<Observation> {
        if (!this.page || !this.stagehand) return this.emptyObservation();
        try {
            const slice = await this.captureSlice('Current');
            const dom = await this.extractDOMFast();
            const domStr = JSON.stringify(dom);
            return {
                screenshot: slice.screenshot,
                domContext: domStr,
                url: this.page.url(),
                title: await this.page.title(),
                dimensions: { width: 1280, height: 800 },
                sections: [{ ...slice, domContext: domStr }]
            };
        } catch {
            return this.emptyObservation();
        }
    }

    private emptyObservation(): Observation {
        return {
            screenshot: '',
            url: '',
            title: '',
            domContext: '[]',
            dimensions: { width: 1280, height: 800 }
        };
    }

    // ─── Actions ────────────────────────────────────────────────────────────────

    async perform(action: Action) {
        if (!this.page || !this.stagehand) throw new Error('Browser not initialized');
        return this._perform(action);
    }

    private async _perform(action: Action) {
        if (!this.page || !this.stagehand) throw new Error('Browser not initialized');

        const oldUrl = this.page.url();
        const oldPageCount = (this.stagehand as any).context?.pages?.()?.length ?? 1;

        try {
            switch (action.type) {
                case 'click':
                case 'type': {
                    const instruction = action.type === 'click'
                        ? `Click on: ${action.text || action.reasoning}`
                        : `Type "${action.text}" into the field for: ${action.reasoning}`;

                    console.log(`Stagehand: ${instruction}`);
                    const t0 = Date.now();
                    await this.stagehand.act(instruction, { page: this.page });
                    this.metrics.action_latency.push(Date.now() - t0);

                    for (let i = 0; i < 3; i++) {
                        await this.page.waitForTimeout(300);
                        const newCount = (this.stagehand as any).context?.pages?.()?.length ?? 1;
                        if (newCount > oldPageCount) {
                            const pages = (this.stagehand as any).context.pages();
                            this.page = pages[pages.length - 1];
                            await this.page.bringToFront?.().catch(() => { });
                            break;
                        }
                        if (this.page.url() !== oldUrl) break;
                    }
                    await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => { });
                    break;
                }

                case 'scroll':
                    if (action.text === 'top') {
                        await this.page.evaluate(() => window.scrollTo(0, 0));
                    } else if (action.text === 'bottom') {
                        await this.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
                    } else {
                        await this.page.evaluate(() => window.scrollBy(0, 700));
                    }
                    break;

                case 'wait':
                    await this.page.waitForTimeout(2000);
                    break;
            }
        } catch (err) {
            console.warn(`Stagehand action "${action.type}" failed:`, err);
            if (action.type === 'click' && action.selector) {
                await this.page.click(action.selector, { timeout: 5000 }).catch(() => { });
            }
        }

        const newUrl = this.page.url();
        const newPageCount = (this.stagehand as any).context?.pages?.()?.length ?? 1;
        if (newUrl !== oldUrl || newPageCount > oldPageCount) {
            await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => { });
        }
    }

    // ─── Link harvesting ────────────────────────────────────────────────────────

    async getContentLinks(maxLinks = 20): Promise<string[]> {
        if (!this.page) return [];
        const origin = new URL(this.page.url()).origin;

        const SKIP_PATTERNS = [
            /\.(jpg|jpeg|png|gif|webp|svg|ico|pdf|zip|css|js|woff|ttf)(\?|$)/i,
            /\/(login|logout|signup|register|auth|oauth|callback|admin|api)\//i,
            /\?.*page=\d+/i,
            /\?.*sort=/i,
            /\?.*filter=/i,
            /#/
        ];

        try {
            const links: string[] = await this.page.evaluate((originStr: string) => {
                return Array.from(document.querySelectorAll('a[href]'))
                    .map((a: any) => a.href)
                    .filter((href: string) => {
                        try {
                            const u = new URL(href);
                            return u.origin === originStr && u.pathname !== '/';
                        } catch (_) { return false; }
                    });
            }, origin);

            const seenPaths = new Set<string>();
            const filtered: string[] = [];

            for (const link of links) {
                if (SKIP_PATTERNS.some(p => p.test(link))) continue;
                try {
                    const u = new URL(link);
                    const path = u.pathname.replace(/\/$/, '').toLowerCase();
                    if (seenPaths.has(path)) continue;
                    seenPaths.add(path);
                    filtered.push(`${u.origin}${u.pathname}`);
                    if (filtered.length >= maxLinks) break;
                } catch (_) { }
            }

            return filtered;
        } catch (_) {
            return [];
        }
    }

    // ─── Fast page scan (no stagehand.observe — saves ~3-5s per page) ───────────
    //
    // Used by the Crawl-Reason-Repeat engine.  The LLM receives screenshots only;
    // it does not need DOM context (domContext) during the reasoning phase, so we
    // skip the expensive stagehand.observe() call that captureSlice('Primary', true)
    // would trigger.

    async observeFastPage(): Promise<Observation> {
        if (!this.page || !this.stagehand) return this.emptyObservation();
        return this._observeFastPage().catch((err: any) => {
            if (isCDPTimeout(err)) throw err; // propagate so orchestrator can restart browser
            return this.emptyObservation();
        });
    }

    private async _observeFastPage(): Promise<Observation> {
        if (!this.page) return this.emptyObservation();
        return this._captureAllSlices();
    }

    // ─── Heuristic interactions (no LLM — pure Playwright JS) ────────────────
    //
    // Returns visible CTAs, nav links, and buttons ranked by priority so the
    // orchestrator can perform a small set of meaningful clicks for heatmap data
    // without any LLM calls during the browser phase.

    async getHeuristicClicks(max = 4): Promise<Array<{
        text: string;
        x: number; y: number;    // ABSOLUTE document coords (not viewport-relative)
        w: number; h: number;
        isNavLink: boolean;
    }>> {
        if (!this.page) return [];

        // Scroll to top so elements are in a deterministic position
        await this.page.evaluate(() => window.scrollTo(0, 0));
        await this.page.waitForTimeout(100);

        const CTA_RE = /sign.?up|get.?start|start free|try.?free|try.?now|buy|purchase|pricing|plans?|checkout|demo|learn more|features|contact|subscribe|explore|watch|view|get.?demo|book.?a/i;

        try {
            // page.$$() is compatible with all Playwright versions (locator().all() requires 1.29+)
            const handles = await this.page.$$('a[href], button, [role="button"]');
            const scrollY = await this.page.evaluate(() => window.scrollY).catch(() => 0);

            const found: Array<{ text: string; x: number; y: number; w: number; h: number; isNavLink: boolean; priority: number }> = [];
            const seen = new Set<string>();

            for (const handle of handles) {
                if (found.length >= 50) break;

                // boundingBox returns null if element is not rendered / has 0 size / is hidden
                const box = await handle.boundingBox().catch(() => null);
                if (!box || box.width < 5 || box.height < 5) continue;

                const text = ((await handle.textContent().catch(() => '')) || '')
                    .replace(/\s+/g, ' ').trim().slice(0, 60);
                if (!text || text.length < 2 || seen.has(text.toLowerCase())) continue;
                seen.add(text.toLowerCase());

                const href: string = await handle.evaluate((el: any) => el.href || '').catch(() => '');
                if (href.startsWith('mailto:') || href.startsWith('tel:') || href.includes('javascript:')) continue;

                const isNav: boolean = await handle.evaluate((el: Element) =>
                    !!el.closest('nav, header, [role="navigation"], [class*="nav"], [class*="header"], [class*="menu"]')
                ).catch(() => false);

                const isBtn: boolean = await handle.evaluate((el: Element) =>
                    el.tagName === 'BUTTON' || el.getAttribute('role') === 'button'
                ).catch(() => false);

                const priority = CTA_RE.test(text) ? 10 : isBtn ? 8 : isNav ? 7 : 4;

                // box.x/box.y are viewport-relative; add scrollY for absolute document coords
                found.push({
                    text,
                    x: Math.round(box.x + box.width / 2),
                    y: Math.round(box.y + scrollY + box.height / 2),
                    w: Math.round(box.width),
                    h: Math.round(box.height),
                    isNavLink: isNav,
                    priority,
                });
            }

            const results = found.sort((a, b) => b.priority - a.priority).slice(0, max);
            console.log(`getHeuristicClicks: ${handles.length} locators → ${found.length} valid → taking ${results.length}: [${results.map(r => `"${r.text}"`).join(', ')}]`);

            return results.map(({ priority: _p, ...rest }) => rest);
        } catch (err: any) {
            console.warn(`getHeuristicClicks failed: ${err.message}`);
            return [];
        }
    }

    // ─── Single native click at viewport coords + post-click screenshot ───────

    // x, y are ABSOLUTE document coordinates (as returned by getHeuristicClicks)
    async clickAtCoords(x: number, y: number): Promise<{ newUrl: string; screenshot: string }> {
        if (!this.page) throw new Error('Browser not initialized');
        const oldUrl = this.page.url();

        // Scroll so the target is vertically centred in the viewport, then compute
        // the viewport-relative Y coordinate to pass to mouse.click().
        const vh = await this.page.evaluate(() => window.innerHeight || 800);
        const targetScrollY = Math.max(0, y - Math.round(vh / 2));
        await this.page.evaluate((sy: number) => window.scrollTo(0, sy), targetScrollY);
        await this.page.waitForTimeout(120);

        // After scroll: viewport coord = absolute - scrollY
        const actualScrollY = await this.page.evaluate(() => window.scrollY);
        const viewportY = y - actualScrollY;
        const viewportX = x; // horizontal scroll is almost never an issue

        await this.page.mouse.click(viewportX, viewportY);
        await this.page.waitForTimeout(250);
        await this.page.waitForLoadState('domcontentloaded', { timeout: 4000 }).catch(() => { });

        const newUrl = this.page.url();
        const screenshot = (await this.page.screenshot({ type: 'jpeg', quality: 45 })).toString('base64');

        if (newUrl !== oldUrl) {
            this.metrics.navigation_latency.push(0);
        }

        return { newUrl, screenshot };
    }

    getCurrentUrl(): string {
        return this.page?.url() ?? '';
    }

    // ─── Utilities ──────────────────────────────────────────────────────────────

    async evaluate<T>(fn: (...args: any[]) => T | Promise<T>, ...args: any[]): Promise<T> {
        if (!this.page) throw new Error('Browser not initialized');
        return this.page.evaluate(fn, ...args);
    }

    async waitForTimeout(ms: number) {
        if (this.page) await this.page.waitForTimeout(ms);
    }

    async close() {
        if (this.stagehand) await this.stagehand.close().catch(() => { });
        this.page = null;
        this.stagehand = null;
    }

    // ─── Cookie portability (persist auth across per-page browser instances) ──

    async exportCookies(): Promise<any[]> {
        if (!this.stagehand) return [];
        try {
            const context = (this.stagehand as any).context;
            return await context?.cookies?.() ?? [];
        } catch {
            return [];
        }
    }

    async restoreCookies(cookies: any[]): Promise<void> {
        if (!this.stagehand || !cookies.length) return;
        try {
            const context = (this.stagehand as any).context;
            if (context?.addCookies) await context.addCookies(cookies);
        } catch { }
    }

    getMetrics(): HeuristicMetrics {
        return { ...this.metrics };
    }

    static async shutdown() { }
}
