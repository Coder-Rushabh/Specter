/**
 * Global concurrency limiter for browser sessions.
 *
 * LOCAL mode  — each Chromium uses ~400–600 MB RAM, so we cap at 2 to keep
 *               peak usage ~1.2 GB on a typical container.
 *
 * Browserbase — the browser runs remotely so local RAM is not a concern.
 *               Cap is raised to 5 by default; set MAX_CONCURRENT_BROWSERS
 *               env var to override based on your Browserbase plan limits.
 */

const MAX_CONCURRENT_BROWSERS = process.env.BROWSERBASE_API_KEY
    ? parseInt(process.env.MAX_CONCURRENT_BROWSERS || '5', 10)
    : parseInt(process.env.MAX_CONCURRENT_BROWSERS || '2', 10);
let active = 0;
const queue: Array<() => void> = [];

export async function acquireBrowser(): Promise<void> {
    if (active < MAX_CONCURRENT_BROWSERS) {
        active++;
        return;
    }
    await new Promise<void>(resolve => queue.push(resolve));
    active++;
}

export function releaseBrowser(): void {
    active--;
    const next = queue.shift();
    if (next) next();
}
