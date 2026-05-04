// ─── SiteMap — priority queue + visit tracker for Crawl-Reason-Repeat ────────
//
// Responsibilities:
//   • Filter external links (hostname mismatch)
//   • Deduplicate by normalised URL
//   • Cap content-section pages (blog/docs) at CONTENT_PATTERN_LIMIT per pattern
//   • Priority-sort the queue so high-value pages (pricing, checkout) are visited first
//   • Track the running journey narrative string

const URL_PRIORITY: Array<[RegExp, number]> = [
    [/\/(pricing|plans?|buy|purchase)\b/i, 10],
    [/\/(checkout|cart|payment)\b/i, 9],
    [/\/(features?|product|overview|tour)\b/i, 8],
    [/\/(about|company|team|mission)\b/i, 6],
    [/\/(docs?|documentation|guide|tutorial|help|support|faq)\b/i, 5],
    [/\/(blog|news|articles?|posts?|updates?)\b/i, 3],
    [/\/(changelog|release)\b/i, 2],
];

const AUTH_URL_PATTERN =
    /\/(login|signin|sign-in|signup|sign-up|register|auth|account\/create|join|onboarding)(\/|\?|$)/i;

const SKIP_URL_PATTERN =
    /\.(jpg|jpeg|png|gif|webp|svg|ico|pdf|zip|css|js|woff|ttf)(\?|$)/i;

// URL patterns that are considered "content" (blog/docs articles)
const CONTENT_SECTION_PATTERN =
    /\/(blog|news|articles?|posts?|docs?|guides?|tutorials?)\b/i;

const CONTENT_PATTERN_LIMIT = 2;
const MAX_QUEUE_DEPTH = 50;

export interface SiteNode {
    url: string;
    visitedAt: Date;
    isAuth: boolean;
}

export class SiteMap {
    private visited = new Map<string, SiteNode>();
    private queue: Array<{ url: string; priority: number }> = [];
    // Counts how many times a URL pattern has been enqueued (prevents flooding the queue)
    private patternCounts = new Map<string, number>();
    private baseHostname: string;

    /** Running first-person narrative updated by the LLM after each page. */
    journeyNarrative = '';

    constructor(startUrl: string) {
        try {
            this.baseHostname = new URL(startUrl).hostname;
        } catch {
            this.baseHostname = '';
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    static isAuthUrl(url: string): boolean {
        return AUTH_URL_PATTERN.test(url);
    }

    /**
     * Collapse variable URL segments (IDs, UUIDs, slugs) into `*` so that
     * "/blog/my-long-post-title" and "/blog/another-post" map to the same pattern.
     */
    static urlPattern(url: string): string {
        try {
            const u = new URL(url);
            const parts = u.pathname.split('/').map(seg => {
                if (!seg) return seg;
                if (/^\d+$/.test(seg)) return '*';
                if (/^[0-9a-f-]{8,}$/i.test(seg)) return '*';
                // Long hyphenated slugs (article titles etc.)
                if (seg.includes('-') && seg.length > 25) return '*';
                return seg;
            });
            return u.hostname + parts.join('/');
        } catch {
            return url;
        }
    }

    private urlPriority(url: string): number {
        // Add sub-1 jitter so links within the same tier visit in a random order
        // each run while still respecting cross-tier ranking (tiers are ≥1 apart).
        const jitter = Math.random() * 0.9;
        for (const [pattern, score] of URL_PRIORITY) {
            if (pattern.test(url)) return score + jitter;
        }
        return 5 + jitter;
    }

    private normalize(url: string): string {
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

    // ─── Queue management ─────────────────────────────────────────────────────

    enqueue(links: string[]): void {
        for (const raw of links) {
            let url: string;
            try {
                const u = new URL(raw);
                // Hard filter: only same hostname (external links skipped entirely)
                if (
                    this.baseHostname &&
                    u.hostname !== this.baseHostname &&
                    !u.hostname.endsWith('.' + this.baseHostname)
                ) continue;
                // Drop query params and fragments — we want clean canonical URLs
                url = `${u.origin}${u.pathname}`;
            } catch {
                continue;
            }

            if (SKIP_URL_PATTERN.test(url)) continue;

            const normalized = this.normalize(url);
            if (this.visited.has(normalized)) continue;
            if (this.queue.some(q => this.normalize(q.url) === normalized)) continue;

            // Content section dedup: max CONTENT_PATTERN_LIMIT per blog/docs pattern
            const pattern = SiteMap.urlPattern(url);
            if (CONTENT_SECTION_PATTERN.test(url)) {
                const count = this.patternCounts.get(pattern) || 0;
                if (count >= CONTENT_PATTERN_LIMIT) continue;
            }

            if (this.queue.length >= MAX_QUEUE_DEPTH) continue;

            const priority = this.urlPriority(url);
            this.queue.push({ url, priority });
            this.patternCounts.set(pattern, (this.patternCounts.get(pattern) || 0) + 1);

            // Maintain descending priority order
            this.queue.sort((a, b) => b.priority - a.priority);
        }
    }

    dequeue(): string | null {
        if (this.queue.length === 0) return null;

        // 65% of the time: take the highest-priority item (normal priority behaviour).
        // 35% of the time: pick a random item from anywhere in the queue so that
        // lower-priority and "default" pages still get a chance to be visited.
        if (this.queue.length > 1 && Math.random() < 0.35) {
            const idx = Math.floor(Math.random() * this.queue.length);
            return this.queue.splice(idx, 1)[0].url;
        }

        return this.queue.shift()?.url ?? null;
    }

    markVisited(url: string, isAuth = false): void {
        const normalized = this.normalize(url);
        this.visited.set(normalized, { url, visitedAt: new Date(), isAuth });
    }

    hasVisited(url: string): boolean {
        return this.visited.has(this.normalize(url));
    }

    visitedCount(): number {
        return this.visited.size;
    }

    queueLength(): number {
        return this.queue.length;
    }

    /** Seed visited set from a previous session (crash recovery). */
    seedVisited(urls: string[]): void {
        for (const url of urls) {
            this.markVisited(url, SiteMap.isAuthUrl(url));
        }
    }
}
