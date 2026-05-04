export type ActionType = 'click' | 'type' | 'scroll' | 'wait' | 'complete' | 'fail' | 'skip_node';

export type UXEmotion =
    | 'delight'
    | 'satisfaction'
    | 'curiosity'
    | 'surprise'
    | 'neutral'
    | 'confusion'
    | 'boredom'
    | 'frustration'
    | 'disappointment';

export interface Action {
    type: ActionType;
    selector?: string;
    text?: string;
    reasoning: string;
    emotional_state: UXEmotion | string;
    emotional_intensity: number; // 0.0 – 1.0
    current_url?: string;
    ux_feedback?: string;
    proposed_solution?: string;
    specific_emotion?: string;
    possible_paths?: string[];
}

export interface Archetype {
    id: string;
    icon_type: 'users' | 'zap' | 'user' | 'check' | 'globe' | 'x' | 'shopping-cart' | 'home' | 'settings';
    desc: string;
}

// A single captured viewport slice (screenshot + interactive elements)
export interface ObservationSection {
    screenshot: string;   // base64 JPEG
    domContext: string;   // JSON array of interactive elements
    label?: string;       // 'Top' | 'Mid' | 'Bottom'
    scrollY?: number;     // scroll offset when captured
}

export interface Observation {
    screenshot: string;   // Primary / current viewport screenshot (base64)
    url: string;
    title: string;
    domContext?: string;  // Primary viewport interactive elements
    dimensions: { width: number; height: number };
    // All sections captured during a full-page scan (Top/Mid/Bottom)
    sections?: ObservationSection[];
}

export interface PersonaProfile {
    name: string;
    age_range: string;
    geolocation: string;
    tech_literacy: 'low' | 'medium' | 'high';
    domain_familiarity: string;
    goal_prompt: string;
}

export interface HeuristicMetrics {
    broken_links: string[];
    navigation_latency: number[]; // ms
    request_failures: number;
    action_latency: number[];     // ms for Stagehand acts
    last_load_time: number;
}

// Condensed multi-section UX analysis returned from a single LLM call
export interface PageScanAnalysis {
    sections: Array<{
        label: string;           // 'Top' | 'Mid' | 'Bottom'
        ux_feedback: string;
        emotional_state: UXEmotion | string;
        emotional_intensity: number;
        proposed_solution?: string;
    }>;
    overall_emotion: UXEmotion | string;
    overall_intensity: number;
    page_summary: string;
}

// Extended analysis returned by analysePage() — includes navigation intent
export interface PageAnalysisResult extends PageScanAnalysis {
    /** Concrete UX problems found on this page */
    friction_points: string[];
    /** Well-executed UX elements worth noting */
    positives: string[];
    /** 3–5 URLs from the page the LLM recommends visiting next (empty for auth pages) */
    next_links: string[];
    /** One-sentence update to the running journey narrative */
    journey_narrative_update: string;
}

export interface LLMProvider {
    decideNextAction(
        observation: Observation,
        persona: PersonaProfile,
        history: Action[],
        blacklist?: string[],
        triedElements?: string[]
    ): Promise<Action>;

    // Analyzes all captured sections in ONE call instead of N separate calls
    analyzePageSections(
        sections: ObservationSection[],
        pageUrl: string,
        pageTitle: string,
        persona: PersonaProfile
    ): Promise<PageScanAnalysis>;

    /**
     * Crawl-Reason-Repeat: analyse a captured page and decide which links to visit next.
     * Browser is already closed when this is called — only screenshots + metadata are passed.
     */
    analysePage(
        sections: ObservationSection[],
        pageUrl: string,
        pageTitle: string,
        persona: PersonaProfile,
        isAuthPage: boolean,
        availableLinks: string[],
        journeyNarrative: string
    ): Promise<PageAnalysisResult>;

    generateSummary(prompt: string): Promise<string>;
    generatePersonas(siteContext: string, userPrompt: string, archetypes: string[]): Promise<PersonaProfile[]>;
    suggestArchetypes(siteContext: string): Promise<Archetype[]>;
}