function waitForElement(selector: string, timeout = 2000): Promise<HTMLElement | null> {
    return new Promise(resolve => {
        const existing = document.querySelector(selector) as HTMLElement | null;
        if (existing) return resolve(existing);

        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector) as HTMLElement | null;
            if (el) { observer.disconnect(); resolve(el); }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
    });
}

export async function scrollToStep(personaName: string, stepNumber: number) {
    const stepSelector = `[data-step-key="${personaName}-${stepNumber}"]`;

    // 1. If the AuditTrail section is not open yet (no page groups in DOM), open it
    if (!document.querySelector('[data-page-group]')) {
        const auditToggle = document.querySelector(`[data-audit-trail="${personaName}"]`) as HTMLElement | null;
        if (auditToggle) auditToggle.click();
        // Wait until page group headers are rendered
        const appeared = await waitForElement('[data-page-group]');
        if (!appeared) return;
    }

    // 2. If the step card is not rendered yet (page group is closed), open the right one
    if (!document.querySelector(stepSelector)) {
        const pageGroups = document.querySelectorAll('[data-page-group]');
        for (const pg of Array.from(pageGroups)) {
            const steps = (pg.getAttribute('data-contains-steps') || '')
                .split(',').map(Number).filter(Boolean);
            if (steps.includes(stepNumber)) {
                (pg as HTMLElement).click();
                break;
            }
        }
        // Wait until the step card renders inside the now-open page group
        await waitForElement(stepSelector);
    }

    // 3. Scroll to and highlight the step card
    const el = document.querySelector(stepSelector) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.setAttribute('data-highlighted', 'true');
    setTimeout(() => el.removeAttribute('data-highlighted'), 2000);
}
