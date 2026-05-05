import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    Observation, Action, PersonaProfile, LLMProvider,
    Archetype, ObservationSection, PageScanAnalysis, PageAnalysisResult
} from './types';

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const ActionSchema = z.object({
    type: z.enum(['click', 'type', 'scroll', 'wait', 'complete', 'fail', 'skip_node']),
    selector: z.string().optional(),
    text: z.string().optional(),
    reasoning: z.string(),
    emotional_state: z.enum(['delight', 'satisfaction', 'curiosity', 'surprise', 'neutral', 'confusion', 'boredom', 'frustration', 'disappointment']),
    emotional_intensity: z.number().min(0).max(1),
    specific_emotion: z.string().optional(),
    ux_feedback: z.string(),
    proposed_solution: z.string().optional(),
    possible_paths: z.array(z.string()).default([])
});

const SectionResultSchema = z.object({
    label: z.string(),
    ux_feedback: z.string(),
    emotional_state: z.enum(['delight', 'satisfaction', 'curiosity', 'surprise', 'neutral', 'confusion', 'boredom', 'frustration', 'disappointment']),
    emotional_intensity: z.number().min(0).max(1),
    proposed_solution: z.string().optional()
});

const PageScanSchema = z.object({
    sections: z.array(SectionResultSchema),
    overall_emotion: z.enum(['delight', 'satisfaction', 'curiosity', 'surprise', 'neutral', 'confusion', 'boredom', 'frustration', 'disappointment']),
    overall_intensity: z.number().min(0).max(1),
    page_summary: z.string()
});

const PersonaSchema = z.object({
    name: z.string(),
    age_range: z.string(),
    geolocation: z.string(),
    tech_literacy: z.enum(['low', 'medium', 'high']),
    domain_familiarity: z.string(),
    goal_prompt: z.string()
});

const ArchetypeSchema = z.object({
    id: z.string(),
    icon_type: z.enum(['users', 'zap', 'user', 'check', 'globe', 'x', 'shopping-cart', 'home', 'settings']),
    desc: z.string()
});

const PageAnalysisResultSchema = PageScanSchema.extend({
    friction_points: z.array(z.string()).default([]),
    positives: z.array(z.string()).default([]),
    next_links: z.array(z.string()).default([]),
    journey_narrative_update: z.string().default('')
});

// ─── Shared prompt builders ───────────────────────────────────────────────────

function trimHistory(history: Action[]): string {
    return JSON.stringify(
        history.slice(-4).map(a => ({
            t: a.type,
            s: (a.selector || a.text || '').slice(0, 40),
            url: (a.current_url || '').slice(-35),
            r: (a.reasoning || '').slice(0, 50)
        }))
    );
}

function trimDom(domContext: string | undefined, max = 28): string {
    if (!domContext) return '[]';
    try {
        const els = JSON.parse(domContext);
        // Prefer interactive elements (links, buttons, inputs) over generic elements
        const interactive = els.filter((e: any) =>
            ['link', 'button', 'textbox', 'searchbox', 'input'].includes((e.role || '').toLowerCase())
        );
        const rest = els.filter((e: any) =>
            !['link', 'button', 'textbox', 'searchbox', 'input'].includes((e.role || '').toLowerCase())
        );
        const merged = [...interactive, ...rest].slice(0, max);
        return JSON.stringify(merged.map((e: any) => ({ role: e.role, text: e.text, sel: e.selector })));
    } catch {
        return '[]';
    }
}

function buildActionPrompt(
    observation: Observation,
    persona: PersonaProfile,
    history: Action[],
    blacklist: string[] = [],
    triedElements: string[] = []
): string {
    const uniquePages = new Set(history.map(a => a.current_url?.split('?')[0])).size;
    return `You are ${persona.name} (${persona.tech_literacy} tech literacy, goal: ${persona.goal_prompt}).
URL: ${observation.url} | Pages explored: ${uniquePages}

INTERACTIVE ELEMENTS:
${trimDom(observation.domContext)}

RECENT HISTORY:
${trimHistory(history)}

BLOCKED: ${[...blacklist, ...triedElements].slice(0, 10).join(', ') || 'none'}

INSTRUCTIONS:
- Behave as this persona. Explore the page as they would.
- 'reasoning': first-person internal monologue (why you're choosing this action).
- 'ux_feedback': honest critique of what is visually confusing, missing, or well-designed RIGHT NOW on this screen.
- 'proposed_solution': specific, actionable fix for the designer (required if friction found).
- Use 'skip_node' if the page is a 404, completely irrelevant to your goal, or has no useful content.
- Use 'complete' only when you have fully explored your goal path.

⚠️ AUTH FORMS — STRICT RULE (highest priority):
If the current page contains a login form, sign-up form, registration form, or any page that asks for credentials (email/password, phone/OTP, social login buttons), you MUST:
1. Set 'type' to 'skip_node'.
2. Write 'ux_feedback' about the design of the auth form itself (clarity, trust signals, friction).
3. Do NOT attempt to type into any field. Do NOT click login/signup/submit buttons.
This applies to: /login, /signin, /signup, /register, /auth, /account/create, and any page whose primary content is an authentication form.

Return JSON: { type, text, reasoning, emotional_state, emotional_intensity, specific_emotion, ux_feedback, proposed_solution, possible_paths }`;
}

function buildPageScanPrompt(
    sections: ObservationSection[],
    pageUrl: string,
    pageTitle: string,
    persona: PersonaProfile
): string {
    const sectionLabels = sections.map(s => s.label || 'Section').join(', ');
    return `You are a UX auditor evaluating a webpage as the persona: ${persona.name}.
Persona goal: ${persona.goal_prompt}
Page: ${pageTitle} (${pageUrl})
Sections captured: ${sectionLabels}

For EACH section screenshot (provided as images in order), analyze:
1. Visual hierarchy — is the most important content prominent?
2. Content clarity — is the messaging clear for this persona?
3. Friction — any confusing UI, missing CTAs, broken layouts, or trust issues?
4. Emotional response — how would this persona feel seeing this section?

Be specific and critical. Generic feedback like "looks clean" is not acceptable.
Point to exact elements: headlines, CTAs, images, forms, navigation items.

Return JSON matching this structure:
{
  "sections": [
    { "label": "Top", "ux_feedback": "...", "emotional_state": "...", "emotional_intensity": 0.0-1.0, "proposed_solution": "..." },
    ...
  ],
  "overall_emotion": "...",
  "overall_intensity": 0.0-1.0,
  "page_summary": "2-3 sentence summary of overall UX quality for this persona"
}`;
}

function buildPageAnalysisPrompt(
    sections: ObservationSection[],
    pageUrl: string,
    pageTitle: string,
    persona: PersonaProfile,
    isAuthPage: boolean,
    availableLinks: string[],
    journeyNarrative: string
): string {
    const sectionLabels = sections.map(s => s.label || 'Section').join(', ');
    const linkList = availableLinks.slice(0, 25).join('\n');
    return `You are conducting a UX audit as the persona: ${persona.name} (${persona.tech_literacy} tech literacy, goal: ${persona.goal_prompt}).

Journey context: ${journeyNarrative || 'Starting the journey on this site.'}
Current page: "${pageTitle}" (${pageUrl})
Sections captured: ${sectionLabels}
${isAuthPage ? '\n⚠️ This is an authentication/login page. Analyze the UI design quality only — do NOT suggest visiting any further links from here.\n' : ''}
For EACH section screenshot provided, analyze:
1. Visual hierarchy — is the most important content prominent?
2. Content clarity — is the messaging clear for this persona?
3. Friction — any confusing UI, missing CTAs, broken layouts, or trust issues?
4. Emotional response — how would this persona feel seeing this section?

Be specific and critical. Point to exact elements: headlines, CTAs, images, forms, navigation items.
${!isAuthPage && availableLinks.length > 0 ? `\nAvailable links on this page (choose the 3–5 most valuable to explore next for this persona's goal):\n${linkList}\n` : ''}
Return JSON:
{
  "sections": [
    { "label": "Top|Mid|Bottom", "ux_feedback": "specific critique", "emotional_state": "...", "emotional_intensity": 0.0-1.0, "proposed_solution": "..." }
  ],
  "overall_emotion": "...",
  "overall_intensity": 0.0-1.0,
  "page_summary": "2-3 sentence overall UX quality assessment for this persona",
  "friction_points": ["specific UX problem 1", "specific UX problem 2"],
  "positives": ["good UX element 1"],
  "next_links": ${isAuthPage ? '[]' : '["https://...", "https://..."]'},
  "journey_narrative_update": "one sentence: what did this persona learn or feel on this page"
}`;
}

function pageAnalysisFallback(sections: ObservationSection[]): PageAnalysisResult {
    return {
        sections: sections.map(s => ({
            label: s.label || 'Section',
            ux_feedback: 'Analysis unavailable',
            emotional_state: 'neutral',
            emotional_intensity: 0.3
        })),
        overall_emotion: 'neutral',
        overall_intensity: 0.3,
        page_summary: 'Analysis unavailable',
        friction_points: [],
        positives: [],
        next_links: [],
        journey_narrative_update: ''
    };
}

// ─── OpenAI Provider ──────────────────────────────────────────────────────────
// Uses gpt-4o for vision tasks (decideNextAction, analyzePageSections)
// Uses gpt-4o-mini for text-only tasks (summaries, personas, archetypes) — ~15x cheaper

export class OpenAIProvider implements LLMProvider {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    async decideNextAction(
        observation: Observation,
        persona: PersonaProfile,
        history: Action[],
        blacklist: string[] = [],
        triedElements: string[] = []
    ): Promise<Action> {
        const prompt = buildActionPrompt(observation, persona, history, blacklist, triedElements);
        const response = await this.client.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 600,
            messages: [
                { role: 'system', content: 'Synthetic UX persona. JSON only.' },
                {
                    role: 'user', content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${observation.screenshot}`, detail: 'low' } }
                    ]
                }
            ],
            response_format: zodResponseFormat(ActionSchema, 'action')
        });
        return JSON.parse(response.choices[0].message.content || '{}');
    }

    // Single API call for sampled sections (max 4 to avoid token limits)
    async analyzePageSections(
        sections: ObservationSection[],
        pageUrl: string,
        pageTitle: string,
        persona: PersonaProfile
    ): Promise<PageScanAnalysis> {
        const sampled = sampleSections(sections);
        const prompt = buildPageScanPrompt(sampled, pageUrl, pageTitle, persona);

        const content: any[] = [{ type: 'text', text: prompt }];
        for (const section of sampled) {
            content.push({
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${section.screenshot}`, detail: 'low' }
            });
        }

        const response = await this.client.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 1000,
            messages: [
                { role: 'system', content: 'UX auditor. JSON only. Be specific and critical.' },
                { role: 'user', content }
            ],
            response_format: zodResponseFormat(PageScanSchema, 'page_scan')
        });

        return JSON.parse(response.choices[0].message.content || '{}');
    }

    async analysePage(
        sections: ObservationSection[],
        pageUrl: string,
        pageTitle: string,
        persona: PersonaProfile,
        isAuthPage: boolean,
        availableLinks: string[],
        journeyNarrative: string
    ): Promise<PageAnalysisResult> {
        const sampled = sampleSections(sections);
        const prompt = buildPageAnalysisPrompt(sampled, pageUrl, pageTitle, persona, isAuthPage, availableLinks, journeyNarrative);
        const content: any[] = [{ type: 'text', text: prompt }];
        for (const section of sampled) {
            content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${section.screenshot}`, detail: 'low' } });
        }
        try {
            const response = await this.client.chat.completions.create({
                model: 'gpt-4o',
                max_tokens: 1200,
                messages: [
                    { role: 'system', content: 'UX auditor. JSON only. Be specific and critical.' },
                    { role: 'user', content }
                ],
                response_format: zodResponseFormat(PageAnalysisResultSchema, 'page_analysis')
            });
            return JSON.parse(response.choices[0].message.content || '{}');
        } catch (err: any) {
            console.error(`[OpenAI] analysePage failed for ${pageUrl}: ${err?.message}`);
            return pageAnalysisFallback(sections);
        }
    }

    // text-only: use mini model
    async generateSummary(prompt: string): Promise<string> {
        const res = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 500,
            messages: [{ role: 'user', content: prompt }]
        });
        return res.choices[0].message.content || '';
    }

    async generatePersonas(siteContext: string, userPrompt: string, archetypes: string[]): Promise<PersonaProfile[]> {
        const res = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 800,
            messages: [{
                role: 'user',
                content: `UX Researcher. Generate 5 user persona categories for: ${siteContext}.
Constraints: ${userPrompt || 'none'}. Archetypes: ${archetypes.join(', ')}.
Return JSON: { "personas": [{ "name", "age_range", "geolocation", "tech_literacy", "domain_familiarity", "goal_prompt" }] }
Use role names not human names (e.g. "Budget Traveler", not "John Doe").`
            }],
            response_format: { type: 'json_object' }
        });
        const parsed = JSON.parse(res.choices[0].message.content || '{"personas":[]}');
        return parsed.personas || [];
    }

    async suggestArchetypes(siteContext: string): Promise<Archetype[]> {
        const res = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 400,
            messages: [{
                role: 'user',
                content: `Suggest 6 user archetypes for this site. Return JSON: { "archetypes": [{ "id", "icon_type", "desc" }] }
icon_type must be one of: users, zap, user, check, globe, x, shopping-cart, home, settings
Site: ${siteContext}`
            }],
            response_format: { type: 'json_object' }
        });
        const parsed = JSON.parse(res.choices[0].message.content || '{"archetypes":[]}');
        return parsed.archetypes || [];
    }
}

// ─── Gemini retry helper ──────────────────────────────────────────────────────
// Free tier: 15 RPM. On 429, back off and retry up to 4 times.

async function withGeminiRetry<T>(fn: () => Promise<T>, maxRetries = 4): Promise<T> {
    let delay = 10_000; // start at 10s — enough to clear a free-tier RPM window
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            const is429 = err?.status === 429
                || err?.message?.includes('429')
                || err?.message?.includes('Resource exhausted')
                || err?.message?.includes('Too Many Requests');

            if (is429 && attempt < maxRetries) {
                console.warn(`Gemini 429 — retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})...`);
                await new Promise(r => setTimeout(r, delay));
                delay = Math.min(delay * 2, 60_000); // cap at 60s
            } else {
                throw err;
            }
        }
    }
    throw new Error('Gemini retry limit exceeded');
}

// ─── Section sampler ─────────────────────────────────────────────────────────
// Sending 8 images to a vision LLM in one call often hits token/rate limits and
// returns an empty or truncated response → "Analysis unavailable" on every section.
// Instead, sample up to MAX_LLM_SECTIONS representative slices (always including
// the first and last) so the LLM gets full vertical coverage without being overloaded.

const MAX_LLM_SECTIONS = 4;

function sampleSections(sections: ObservationSection[], max = MAX_LLM_SECTIONS): ObservationSection[] {
    if (sections.length <= max) return sections;
    const result: ObservationSection[] = [sections[0]];
    const step = (sections.length - 1) / (max - 1);
    for (let i = 1; i < max - 1; i++) {
        result.push(sections[Math.round(i * step)]);
    }
    result.push(sections[sections.length - 1]);
    return result;
}

// ─── Gemini JSON repair ───────────────────────────────────────────────────────
// Gemini occasionally embeds literal control characters (newlines, tabs) inside
// JSON string values even with responseMimeType:'application/json'. This breaks
// JSON.parse. We sanitize and extract before giving up.

function safeParseGeminiJson(raw: string): any {
    // 1. Try as-is
    try { return JSON.parse(raw); } catch { /* fall through */ }
    // 2. Escape literal control chars that are invalid inside JSON strings
    const sanitized = raw.replace(/[\u0000-\u001F]/g, ch => {
        if (ch === '\n') return '\\n';
        if (ch === '\r') return '\\r';
        if (ch === '\t') return '\\t';
        return '';
    });
    try { return JSON.parse(sanitized); } catch { /* fall through */ }
    // 3. Extract first { … } block in case of leading/trailing prose
    const start = sanitized.indexOf('{');
    const end = sanitized.lastIndexOf('}');
    if (start !== -1 && end > start) {
        try { return JSON.parse(sanitized.slice(start, end + 1)); } catch { /* fall through */ }
    }
    throw new Error(`Failed to parse Gemini JSON: ${raw.slice(0, 120)}`);
}

// ─── Gemini Provider ──────────────────────────────────────────────────────────
// Uses gemini-2.0-flash for everything — free tier available, fast, vision-capable

export class GeminiProvider implements LLMProvider {
    private genAI: GoogleGenerativeAI;

    constructor(apiKey?: string) {
        this.genAI = new GoogleGenerativeAI(apiKey || process.env.GEMINI_API_KEY || '');
    }


    private get flashModel() {
        return this.genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });
    }

    async decideNextAction(
        observation: Observation,
        persona: PersonaProfile,
        history: Action[],
        blacklist: string[] = [],
        triedElements: string[] = []
    ): Promise<Action> {
        const prompt = buildActionPrompt(observation, persona, history, blacklist, triedElements);
        const result = await withGeminiRetry(() => this.flashModel.generateContent([
            prompt,
            { inlineData: { data: observation.screenshot, mimeType: 'image/jpeg' } }
        ]));
        const action = safeParseGeminiJson(result.response.text());

        // Normalize possible_paths
        if (!Array.isArray(action.possible_paths)) {
            action.possible_paths = typeof action.possible_paths === 'string' ? [action.possible_paths] : [];
        }
        action.possible_paths = action.possible_paths.map((p: any) =>
            typeof p === 'object' ? (p.path_name || p.description || JSON.stringify(p)) : String(p)
        );
        return action;
    }

    // Single call with sampled section images (max 4 to avoid token/rate limits)
    async analyzePageSections(
        sections: ObservationSection[],
        pageUrl: string,
        pageTitle: string,
        persona: PersonaProfile
    ): Promise<PageScanAnalysis> {
        const sampled = sampleSections(sections);
        const prompt = buildPageScanPrompt(sampled, pageUrl, pageTitle, persona);
        const parts: any[] = [prompt];
        for (const section of sampled) {
            parts.push({ inlineData: { data: section.screenshot, mimeType: 'image/jpeg' } });
        }
        try {
            const result = await withGeminiRetry(() => this.flashModel.generateContent(parts));
            const parsed = safeParseGeminiJson(result.response.text());
            // Back-fill any sampled-out sections with neutral placeholders so the
            // caller always gets one result entry per original section
            const sectionResults = sections.map(s => {
                const found = parsed.sections?.find((r: any) => r.label === s.label);
                return found ?? { label: s.label, ux_feedback: parsed.page_summary ?? 'See page summary', emotional_state: parsed.overall_emotion ?? 'neutral', emotional_intensity: parsed.overall_intensity ?? 0.3 };
            });
            return { ...parsed, sections: sectionResults };
        } catch (err: any) {
            console.error(`[Gemini] analyzePageSections failed for ${pageUrl}: ${err?.message}`);
            return pageAnalysisFallback(sections) as PageScanAnalysis;
        }
    }

    async analysePage(
        sections: ObservationSection[],
        pageUrl: string,
        pageTitle: string,
        persona: PersonaProfile,
        isAuthPage: boolean,
        availableLinks: string[],
        journeyNarrative: string
    ): Promise<PageAnalysisResult> {
        const sampled = sampleSections(sections);
        const prompt = buildPageAnalysisPrompt(sampled, pageUrl, pageTitle, persona, isAuthPage, availableLinks, journeyNarrative);
        const parts: any[] = [prompt];
        for (const section of sampled) {
            parts.push({ inlineData: { data: section.screenshot, mimeType: 'image/jpeg' } });
        }
        try {
            const result = await withGeminiRetry(() => this.flashModel.generateContent(parts));
            const parsed = safeParseGeminiJson(result.response.text());
            // Back-fill sampled-out sections
            const sectionResults = sections.map(s => {
                const found = parsed.sections?.find((r: any) => r.label === s.label);
                return found ?? { label: s.label, ux_feedback: parsed.page_summary ?? 'See page summary', emotional_state: parsed.overall_emotion ?? 'neutral', emotional_intensity: parsed.overall_intensity ?? 0.3 };
            });
            return {
                ...parsed,
                sections: sectionResults,
                friction_points: Array.isArray(parsed.friction_points) ? parsed.friction_points : [],
                positives: Array.isArray(parsed.positives) ? parsed.positives : [],
                next_links: Array.isArray(parsed.next_links) ? parsed.next_links : [],
                journey_narrative_update: parsed.journey_narrative_update || ''
            };
        } catch (err: any) {
            console.error(`[Gemini] analysePage failed for ${pageUrl}: ${err?.message}`);
            return pageAnalysisFallback(sections);
        }
    }

    async generateSummary(prompt: string): Promise<string> {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const res = await withGeminiRetry(() => model.generateContent(prompt));
        return res.response.text();
    }

    async generatePersonas(siteContext: string, userPrompt: string, archetypes: string[]): Promise<PersonaProfile[]> {
        const prompt = `UX Researcher. Generate 5 user persona categories for: ${siteContext}.
Archetypes: ${archetypes.join(', ')}. Constraints: ${userPrompt || 'none'}.
Return JSON: { "personas": [{ "name", "age_range", "geolocation", "tech_literacy", "domain_familiarity", "goal_prompt" }] }
Use role names not human names.`;
        const res = await withGeminiRetry(() => this.flashModel.generateContent(prompt));
        try {
            const parsed = JSON.parse(res.response.text());
            return parsed.personas || (Array.isArray(parsed) ? parsed : []);
        } catch {
            return [];
        }
    }

    async suggestArchetypes(siteContext: string): Promise<Archetype[]> {
        const prompt = `Suggest 6 user archetypes for this site.
Return JSON: { "archetypes": [{ "id", "icon_type", "desc" }] }
icon_type must be one of: users, zap, user, check, globe, x, shopping-cart, home, settings
Site: ${siteContext}`;
        const res = await withGeminiRetry(() => this.flashModel.generateContent(prompt));
        try {
            const parsed = JSON.parse(res.response.text());
            return (parsed.archetypes || []).map((a: any, i: number) => ({
                id: a.id || `Archetype-${i}`,
                icon_type: a.icon_type || 'users',
                desc: a.desc || 'No description'
            }));
        } catch {
            return [];
        }
    }
}

// ─── Ollama Provider (local / free) ──────────────────────────────────────────

export class OllamaProvider implements LLMProvider {
    private host: string;
    private models: string[];

    constructor() {
        this.host = process.env.OLLAMA_HOST || 'http://localhost:11434';
        const modelStr = process.env.OLLAMA_MODELS || process.env.OLLAMA_MODEL || 'llama3.2-vision';
        this.models = modelStr.split(',').map(m => m.trim());
    }

    private async call(model: string, prompt: string, images: string[]): Promise<any> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120_000);
        try {
            const res = await fetch(`${this.host}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, prompt, images, stream: false, format: 'json' }),
                signal: controller.signal
            });
            if (!res.ok) throw new Error(`Ollama ${res.status}`);
            return await res.json();
        } finally {
            clearTimeout(timeout);
        }
    }

    async decideNextAction(
        observation: Observation,
        persona: PersonaProfile,
        history: Action[],
        blacklist: string[] = [],
        triedElements: string[] = []
    ): Promise<Action> {
        const prompt = buildActionPrompt(observation, persona, history, blacklist, triedElements);
        try {
            const data = await this.call(this.models[0], prompt, [observation.screenshot]);
            return JSON.parse(data.response) as Action;
        } catch {
            if (this.models.length > 1) {
                const data = await this.call(this.models[1], prompt, [observation.screenshot]);
                return JSON.parse(data.response) as Action;
            }
            throw new Error('All Ollama models failed');
        }
    }

    async analyzePageSections(
        sections: ObservationSection[],
        pageUrl: string,
        pageTitle: string,
        persona: PersonaProfile
    ): Promise<PageScanAnalysis> {
        // Ollama: send only the primary (first) section screenshot to keep inference fast
        const prompt = buildPageScanPrompt(sections, pageUrl, pageTitle, persona);
        const primaryImage = sections[0]?.screenshot || '';
        try {
            const data = await this.call(this.models[0], prompt, [primaryImage]);
            return JSON.parse(data.response);
        } catch {
            return {
                sections: sections.map(s => ({
                    label: s.label || 'Section',
                    ux_feedback: 'Analysis unavailable',
                    emotional_state: 'neutral',
                    emotional_intensity: 0.3
                })),
                overall_emotion: 'neutral',
                overall_intensity: 0.3,
                page_summary: 'Analysis unavailable'
            };
        }
    }

    async analysePage(
        sections: ObservationSection[],
        pageUrl: string,
        pageTitle: string,
        persona: PersonaProfile,
        isAuthPage: boolean,
        availableLinks: string[],
        journeyNarrative: string
    ): Promise<PageAnalysisResult> {
        const prompt = buildPageAnalysisPrompt(sections, pageUrl, pageTitle, persona, isAuthPage, availableLinks, journeyNarrative);
        const primaryImage = sections[0]?.screenshot || '';
        try {
            const data = await this.call(this.models[0], prompt, primaryImage ? [primaryImage] : []);
            const parsed = JSON.parse(data.response);
            return {
                ...parsed,
                friction_points: Array.isArray(parsed.friction_points) ? parsed.friction_points : [],
                positives: Array.isArray(parsed.positives) ? parsed.positives : [],
                next_links: Array.isArray(parsed.next_links) ? parsed.next_links : [],
                journey_narrative_update: parsed.journey_narrative_update || ''
            };
        } catch {
            return pageAnalysisFallback(sections);
        }
    }

    async generateSummary(prompt: string): Promise<string> {
        const data = await this.call(this.models[0], prompt, []);
        return data.response;
    }

    async generatePersonas(siteContext: string, userPrompt: string, archetypes: string[]): Promise<PersonaProfile[]> {
        const prompt = `Generate 5 user persona categories for: ${siteContext}. Constraints: ${userPrompt}. Archetypes: ${archetypes.join(', ')}.
Return JSON: { "personas": [{ "name", "age_range", "geolocation", "tech_literacy", "domain_familiarity", "goal_prompt" }] }`;
        const data = await this.call(this.models[0], prompt, []);
        const parsed = JSON.parse(data.response);
        return parsed.personas || [];
    }

    async suggestArchetypes(siteContext: string): Promise<Archetype[]> {
        const data = await this.call(this.models[0], `Suggest 6 archetypes for: ${siteContext}. Return JSON: { "archetypes": [...] }`, []);
        const parsed = JSON.parse(data.response);
        return parsed.archetypes || [];
    }
}

// ─── OpenRouter Provider ──────────────────────────────────────────────────────
// Unified gateway to 100+ models via OpenAI-compatible API.
// User picks any vision model from openrouter.ai/models?input_modalities=image

export class OpenRouterProvider implements LLMProvider {
    private client: OpenAI;
    private modelName: string;

    constructor(apiKey: string, modelName: string) {
        this.client = new OpenAI({
            apiKey,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': 'https://specter.app',
                'X-Title': 'Specter UX Testing'
            }
        });
        this.modelName = modelName;
    }

    private getContent(res: any): string {
        const content = res?.choices?.[0]?.message?.content;
        if (!content) {
            // Surface the actual error from OpenRouter if present
            const errMsg = res?.error?.message || res?.message || 'No response from model';
            throw new Error(`OpenRouter error: ${errMsg}`);
        }
        return content;
    }

    // Free/open models often return prose, markdown, or JS object syntax instead of strict JSON.
    // Extract and normalize the first valid {...} block from the raw response.
    private extractJson(raw: string): string {
        // Strip markdown code fences
        const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
        const candidate = fenceMatch ? fenceMatch[1].trim() : (() => {
            const start = raw.indexOf('{');
            const end = raw.lastIndexOf('}');
            return (start !== -1 && end > start) ? raw.slice(start, end + 1) : null;
        })();

        if (candidate) {
            // 1. Try as-is (valid JSON)
            try { JSON.parse(candidate); return candidate; } catch { /* fall through */ }
            // 2. Try fixing unquoted keys: { type: "x" } → { "type": "x" }
            const fixed = candidate.replace(/([{,]\s*)([a-zA-Z_]\w*)\s*:/g, '$1"$2":');
            try { JSON.parse(fixed); return fixed; } catch { /* fall through */ }
        }

        throw new Error(`Model returned non-JSON response: ${raw.slice(0, 120)}`);
    }

    // Normalize field variations that free/open models commonly produce.
    private normalizeAction(raw: any): Action {
        const VALID_TYPES = ['click', 'type', 'scroll', 'wait', 'complete', 'fail', 'skip_node'];
        const VALID_EMOTIONS = ['delight', 'satisfaction', 'curiosity', 'surprise', 'neutral', 'confusion', 'boredom', 'frustration', 'disappointment'];

        // Field name aliases
        const type = raw.type || raw.action || raw.action_type || 'skip_node';
        const selector = raw.selector || raw.sel || raw.css_selector || raw.xpath || undefined;

        return {
            type: VALID_TYPES.includes(type) ? type : 'skip_node',
            selector: selector ? String(selector) : undefined,
            text: raw.text ? String(raw.text) : undefined,
            reasoning: raw.reasoning || raw.reason || raw.thought || raw.explanation || '',
            emotional_state: VALID_EMOTIONS.includes(raw.emotional_state) ? raw.emotional_state : 'neutral',
            emotional_intensity: typeof raw.emotional_intensity === 'number'
                ? Math.max(0, Math.min(1, raw.emotional_intensity)) : 0.5,
            specific_emotion: raw.specific_emotion || undefined,
            ux_feedback: raw.ux_feedback || raw.feedback || raw.critique || '',
            proposed_solution: raw.proposed_solution || raw.solution || undefined,
            possible_paths: Array.isArray(raw.possible_paths)
                ? raw.possible_paths.map((p: any) => typeof p === 'object' ? (p.path_name || p.description || JSON.stringify(p)) : String(p))
                : typeof raw.possible_paths === 'string' ? [raw.possible_paths] : []
        };
    }

    private isNoVisionError(err: any): boolean {
        const msg: string = err?.message ?? '';
        return (err?.status === 404 || err?.code === 404) && msg.toLowerCase().includes('image input');
    }

    private isModelNotFoundError(err: any): boolean {
        const msg: string = err?.message ?? '';
        return (err?.status === 404 || err?.code === 404) && msg.toLowerCase().includes('no endpoints found');
    }

    private async withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await fn();
            } catch (err: any) {
                const status = err?.status ?? err?.code;
                const msg: string = err?.message ?? '';
                // Model not found — fail immediately, no point retrying a bad model ID
                if (this.isModelNotFoundError(err)) {
                    throw new Error(`OpenRouter model not found: "${this.modelName}". Check the model ID at openrouter.ai/models — free models require a :free suffix (e.g. google/gemini-2.0-flash-exp:free).`);
                }
                const isRateLimit = status === 429;
                const isProviderError = status === 400 && msg.toLowerCase().includes('provider returned error');
                if ((isRateLimit || isProviderError) && attempt < retries) {
                    // 429s need long waits to clear the rate-limit window (15s, 30s, 60s)
                    // 400 provider blips clear quickly (1s, 2s, 4s)
                    const delay = isRateLimit
                        ? Math.pow(2, attempt) * 15_000
                        : Math.pow(2, attempt) * 1000;
                    const reason = isRateLimit ? '429 rate limit' : '400 provider error';
                    console.warn(`OpenRouter ${reason} — retrying in ${delay / 1000}s (attempt ${attempt + 1}/${retries})`);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                throw err;
            }
        }
        throw new Error('Max retries exceeded');
    }

    async decideNextAction(
        observation: Observation,
        persona: PersonaProfile,
        history: Action[],
        blacklist: string[] = [],
        triedElements: string[] = []
    ): Promise<Action> {
        const prompt = buildActionPrompt(observation, persona, history, blacklist, triedElements);
        const makeRequest = (withImage: boolean) => this.client.chat.completions.create({
            model: this.modelName,
            max_tokens: 600,
            messages: [
                { role: 'system', content: 'You are a synthetic UX persona. You MUST respond with ONLY a valid JSON object. No prose, no markdown, no code fences, no explanation — just the raw JSON object starting with { and ending with }.' },
                {
                    role: 'user', content: withImage
                        ? [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${observation.screenshot}`, detail: 'low' } }
                        ]
                        : prompt
                }
            ],
            response_format: { type: 'json_object' }
        });

        let response: any;
        try {
            response = await this.withRetry(() => makeRequest(true));
        } catch (err: any) {
            if (this.isNoVisionError(err)) {
                console.warn(`Model ${this.modelName} does not support vision — retrying text-only`);
                response = await this.withRetry(() => makeRequest(false));
            } else throw err;
        }

        return this.normalizeAction(JSON.parse(this.extractJson(this.getContent(response))));
    }

    async analyzePageSections(
        sections: ObservationSection[],
        pageUrl: string,
        pageTitle: string,
        persona: PersonaProfile
    ): Promise<PageScanAnalysis> {
        const prompt = buildPageScanPrompt(sections, pageUrl, pageTitle, persona);
        const makeRequest = (withImages: boolean) => {
            const content: any[] = [{ type: 'text', text: prompt }];
            if (withImages) {
                for (const section of sections) {
                    content.push({
                        type: 'image_url',
                        image_url: { url: `data:image/jpeg;base64,${section.screenshot}`, detail: 'low' }
                    });
                }
            }
            return this.client.chat.completions.create({
                model: this.modelName,
                max_tokens: 1000,
                messages: [
                    { role: 'system', content: 'UX auditor. Return ONLY valid JSON. No markdown.' },
                    { role: 'user', content: withImages ? content : prompt }
                ],
                response_format: { type: 'json_object' }
            });
        };

        let response: any;
        try {
            response = await this.withRetry(() => makeRequest(true));
        } catch (err: any) {
            if (this.isNoVisionError(err)) {
                console.warn(`Model ${this.modelName} does not support vision — retrying text-only`);
                response = await this.withRetry(() => makeRequest(false));
            } else throw err;
        }
        try {
            return JSON.parse(this.extractJson(this.getContent(response)));
        } catch {
            return {
                sections: sections.map(s => ({
                    label: s.label || 'Section',
                    ux_feedback: 'Analysis unavailable',
                    emotional_state: 'neutral',
                    emotional_intensity: 0.3
                })),
                overall_emotion: 'neutral',
                overall_intensity: 0.3,
                page_summary: 'Analysis unavailable'
            };
        }
    }

    async analysePage(
        sections: ObservationSection[],
        pageUrl: string,
        pageTitle: string,
        persona: PersonaProfile,
        isAuthPage: boolean,
        availableLinks: string[],
        journeyNarrative: string
    ): Promise<PageAnalysisResult> {
        const prompt = buildPageAnalysisPrompt(sections, pageUrl, pageTitle, persona, isAuthPage, availableLinks, journeyNarrative);
        const makeRequest = (withImages: boolean) => {
            const content: any[] = [{ type: 'text', text: prompt }];
            if (withImages) {
                for (const section of sections) {
                    content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${section.screenshot}`, detail: 'low' } });
                }
            }
            return this.client.chat.completions.create({
                model: this.modelName,
                max_tokens: 1200,
                messages: [
                    { role: 'system', content: 'UX auditor. Return ONLY valid JSON. No markdown.' },
                    { role: 'user', content: withImages ? content : prompt }
                ],
                response_format: { type: 'json_object' }
            });
        };

        let response: any;
        try {
            response = await this.withRetry(() => makeRequest(true));
        } catch (err: any) {
            if (this.isNoVisionError(err)) {
                response = await this.withRetry(() => makeRequest(false));
            } else {
                return pageAnalysisFallback(sections);
            }
        }
        try {
            const parsed = JSON.parse(this.extractJson(this.getContent(response)));
            return {
                ...parsed,
                friction_points: Array.isArray(parsed.friction_points) ? parsed.friction_points : [],
                positives: Array.isArray(parsed.positives) ? parsed.positives : [],
                next_links: Array.isArray(parsed.next_links) ? parsed.next_links : [],
                journey_narrative_update: parsed.journey_narrative_update || ''
            };
        } catch {
            return pageAnalysisFallback(sections);
        }
    }

    async generateSummary(prompt: string): Promise<string> {
        const res = await this.withRetry(() => this.client.chat.completions.create({
            model: this.modelName,
            max_tokens: 500,
            messages: [{ role: 'user', content: prompt }]
        }));
        return this.getContent(res);
    }

    async generatePersonas(siteContext: string, userPrompt: string, archetypes: string[]): Promise<PersonaProfile[]> {
        const res = await this.withRetry(() => this.client.chat.completions.create({
            model: this.modelName,
            max_tokens: 800,
            messages: [{
                role: 'user',
                content: `UX Researcher. Generate 5 user persona categories for: ${siteContext}.
Constraints: ${userPrompt || 'none'}. Archetypes: ${archetypes.join(', ')}.
Return JSON: { "personas": [{ "name", "age_range", "geolocation", "tech_literacy", "domain_familiarity", "goal_prompt" }] }
Use role names not human names (e.g. "Budget Traveler", not "John Doe").`
            }],
            response_format: { type: 'json_object' }
        }));
        const parsed = JSON.parse(this.extractJson(this.getContent(res)));
        return parsed.personas || [];
    }

    async suggestArchetypes(siteContext: string): Promise<Archetype[]> {
        const res = await this.withRetry(() => this.client.chat.completions.create({
            model: this.modelName,
            max_tokens: 400,
            messages: [{
                role: 'user',
                content: `Suggest 6 user archetypes for this site. Return JSON: { "archetypes": [{ "id", "icon_type", "desc" }] }
icon_type must be one of: users, zap, user, check, globe, x, shopping-cart, home, settings
Site: ${siteContext}`
            }],
            response_format: { type: 'json_object' }
        }));
        const parsed = JSON.parse(this.extractJson(this.getContent(res)));
        return parsed.archetypes || [];
    }
}

// ─── LLMService facade ────────────────────────────────────────────────────────

export class LLMService {
    private provider: LLMProvider;

    constructor(config?: { provider: 'ollama' | 'gemini' | 'openai' | 'openrouter'; apiKey?: string; modelName?: string }) {
        const type = config?.provider || 'gemini'; // Default to Gemini (free tier)
        if (type === 'openai') this.provider = new OpenAIProvider();
        else if (type === 'gemini') this.provider = new GeminiProvider(config?.apiKey);
        else if (type === 'openrouter') this.provider = new OpenRouterProvider(config?.apiKey || '', config?.modelName || 'anthropic/claude-3-5-sonnet');
        else this.provider = new OllamaProvider();
    }

    decideNextAction(obs: Observation, p: PersonaProfile, h: Action[], b: string[] = [], t: string[] = []): Promise<Action> {
        return this.provider.decideNextAction(obs, p, h, b, t);
    }

    analyzePageSections(sections: ObservationSection[], url: string, title: string, p: PersonaProfile): Promise<PageScanAnalysis> {
        return this.provider.analyzePageSections(sections, url, title, p);
    }

    analysePage(
        sections: ObservationSection[], url: string, title: string, p: PersonaProfile,
        isAuth: boolean, links: string[], narrative: string
    ): Promise<PageAnalysisResult> {
        return this.provider.analysePage(sections, url, title, p, isAuth, links, narrative);
    }

    generateSummary(prompt: string): Promise<string> {
        return this.provider.generateSummary(prompt);
    }

    generatePersonas(s: string, u: string, a: string[]): Promise<PersonaProfile[]> {
        return this.provider.generatePersonas(s, u, a);
    }

    suggestArchetypes(s: string): Promise<Archetype[]> {
        return this.provider.suggestArchetypes(s);
    }
}