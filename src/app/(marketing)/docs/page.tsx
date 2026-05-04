import Link from 'next/link';
import {
    Globe, Zap, Users, BarChart3, ArrowRight,
    Monitor, Cloud, CheckCircle2, AlertCircle,
    Settings, BookOpen, Play, FileText
} from 'lucide-react';

const sections = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'how-it-works', label: 'How it works', icon: Zap },
    { id: 'running-a-test', label: 'Running a test', icon: Play },
    { id: 'ai-users', label: 'AI users', icon: Users },
    { id: 'ai-providers', label: 'Choosing an AI', icon: Settings },
    { id: 'reading-results', label: 'Reading results', icon: BarChart3 },
    { id: 'faq', label: 'FAQ', icon: FileText },
];

export default function DocsPage() {
    return (
        <div className="flex min-h-screen bg-white">

            {/* ── SIDEBAR ── */}
            <aside className="fixed left-0 top-[60px] bottom-0 w-64 border-r border-slate-200 bg-slate-50 hidden lg:flex flex-col overflow-y-auto">
                <div className="px-5 py-8 space-y-1">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4 px-3">Documentation</p>
                    {sections.map(({ id, label, icon: Icon }) => (
                        <a
                            key={id}
                            href={`#${id}`}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-900 hover:bg-white transition-all group"
                        >
                            <Icon className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                            {label}
                        </a>
                    ))}
                </div>
                <div className="mt-auto px-5 pb-8">
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 space-y-2">
                        <p className="text-xs font-semibold text-indigo-700">Ready to try it?</p>
                        <p className="text-xs text-indigo-500 leading-relaxed">Run your first test in under 5 minutes.</p>
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                            Go to dashboard <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            </aside>

            {/* ── MAIN CONTENT ── */}
            <main className="flex-1 lg:pl-64 pt-[60px]">
                <div className="max-w-3xl mx-auto px-6 py-16 space-y-20">

                    {/* ── HEADER ── */}
                    <div className="space-y-4 pb-10 border-b border-slate-100">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 shadow-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                            <span className="text-xs font-medium text-slate-500">Documentation</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
                            How Specter works
                        </h1>
                        <p className="text-lg text-slate-500 leading-relaxed">
                            Everything you need to know to run your first AI test and understand your results.
                        </p>
                    </div>

                    {/* ── OVERVIEW ── */}
                    <section id="overview" className="space-y-6 scroll-mt-20">
                        <SectionHeading number="01" title="Overview" />
                        <p className="text-slate-600 leading-relaxed">
                            Specter lets you test your website with AI users — simulated people who browse your site, try to complete tasks, and tell you what confused or frustrated them. You get a detailed report of what they found, without needing real testers or waiting days for feedback.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                { icon: Globe, label: 'Paste your URL', desc: 'Point Specter at any website or web app.' },
                                { icon: Users, label: 'AI users browse it', desc: 'Simulated users click around and explore like real people.' },
                                { icon: BarChart3, label: 'Get a report', desc: 'See exactly where they got stuck and what to fix.' },
                            ].map(({ icon: Icon, label, desc }) => (
                                <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                                    <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                        <Icon className="h-4.5 w-4.5 text-indigo-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{label}</p>
                                        <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ── HOW IT WORKS ── */}
                    <section id="how-it-works" className="space-y-6 scroll-mt-20">
                        <SectionHeading number="02" title="How it works" />
                        <p className="text-slate-600 leading-relaxed">
                            Each test run creates one or more AI users. Each user has a name, a goal (like "find the pricing page and figure out if this is worth paying for"), and a personality. Specter then opens a real browser, logs in with the AI user, and lets it explore your site on its own.
                        </p>
                        <p className="text-slate-600 leading-relaxed">
                            As it browses, it records every click, every page it visits, and every thought it has — like a usability tester narrating their experience out loud. When it's done, all of that is turned into a plain-English report.
                        </p>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 space-y-4">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">What an AI user actually does</p>
                            <div className="space-y-3">
                                {[
                                    'Opens your website in a real browser',
                                    'Reads the page and decides what to do next',
                                    'Clicks, scrolls, and fills in forms like a real person would',
                                    'Notes anything that\'s confusing, slow, or broken',
                                    'Keeps going until it completes its goal or gives up',
                                    'Writes up what it found in plain English',
                                ].map((step, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <span className="flex-shrink-0 h-5 w-5 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                            {i + 1}
                                        </span>
                                        <p className="text-sm text-slate-600">{step}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── RUNNING A TEST ── */}
                    <section id="running-a-test" className="space-y-6 scroll-mt-20">
                        <SectionHeading number="03" title="Running a test" />
                        <p className="text-slate-600 leading-relaxed">
                            Go to the dashboard and click <strong className="text-slate-900">Run New Test</strong>. You'll go through three steps:
                        </p>

                        <div className="space-y-4">
                            <StepCard
                                step="Step 1"
                                title="Enter your website URL"
                                desc="Paste the URL of the page you want to test. This can be a homepage, a sign-up flow, a product page — anything publicly accessible or behind a login."
                                note="If your site requires a login, turn on the login option and enter a test account's username and password. Specter will use those credentials to log in before testing."
                            />
                            <StepCard
                                step="Step 2"
                                title="Set up your AI users"
                                desc="Specter automatically generates a set of AI users based on your website. You can edit them, add more, or pick from a library of pre-built user types."
                                note="Each AI user has a name, a goal, a tech skill level, and an app familiarity level. You can describe exactly what kind of person you want to simulate."
                            />
                            <StepCard
                                step="Step 3"
                                title="Choose your AI and launch"
                                desc="Select which AI to use for the test — Gemini (recommended), OpenRouter, or Ollama (runs on your own computer). Then hit Start to begin."
                                note="The test runs in the background. You'll see live progress on the session page. A full report is generated when all users are done."
                            />
                        </div>
                    </section>

                    {/* ── AI USERS ── */}
                    <section id="ai-users" className="space-y-6 scroll-mt-20">
                        <SectionHeading number="04" title="AI users" />
                        <p className="text-slate-600 leading-relaxed">
                            An AI user is a simulated person with a specific goal and background. They're not just random clicks — each one has a personality that shapes how they explore your site.
                        </p>

                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI user settings</p>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {[
                                    { label: 'Name', desc: 'A descriptive label like "First-time visitor" or "Power user looking for pricing". This is just for your reference.' },
                                    { label: 'Goal', desc: 'What this user is trying to do. Be specific: "Find out how much the Pro plan costs and decide if it\'s worth it." The more detailed, the more realistic the test.' },
                                    { label: 'Tech skill', desc: 'How comfortable this person is with technology. Low means they might struggle with complex UIs. High means they\'ll explore more deeply.' },
                                    { label: 'App familiarity', desc: 'Whether this person has used your product before. New users explore differently than returning ones.' },
                                    { label: 'Age range & location', desc: 'Optional context that shapes how the AI user thinks and communicates during the test.' },
                                    { label: 'Run count', desc: 'How many times this user type runs. Running the same user type 3 times gives you more data and catches more issues.' },
                                ].map(({ label, desc }) => (
                                    <div key={label} className="px-5 py-4 flex gap-4">
                                        <p className="text-sm font-semibold text-slate-900 w-36 flex-shrink-0">{label}</p>
                                        <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-3">
                            <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-amber-800">Tip: use the AI user library</p>
                                <p className="text-sm text-amber-700 leading-relaxed">
                                    When setting up a test, you can pick from a pre-built library of common user types (first-time visitors, skeptical buyers, power users, etc.) instead of building from scratch.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* ── AI PROVIDERS ── */}
                    <section id="ai-providers" className="space-y-6 scroll-mt-20">
                        <SectionHeading number="05" title="Choosing an AI" />
                        <p className="text-slate-600 leading-relaxed">
                            Specter uses an AI model to power each user's thinking. You choose which AI to use when setting up a test. Here's what each option means:
                        </p>

                        <div className="space-y-4">
                            <ProviderCard
                                icon={Cloud}
                                color="indigo"
                                name="Gemini"
                                tag="Recommended"
                                desc="Google's AI model. Fast, reliable, and easy to set up. You'll need a free Gemini API key from Google AI Studio."
                                best="Best for most people. Good balance of speed and quality."
                                steps={[
                                    'Go to aistudio.google.com',
                                    'Create a free API key',
                                    'Paste it into the AI key field when running a test',
                                ]}
                            />
                            <ProviderCard
                                icon={Cloud}
                                color="emerald"
                                name="OpenRouter"
                                desc="A service that gives you access to many different AI models (including GPT-4, Claude, Mistral, and more) with one API key."
                                best="Best if you want to try different AI models or already have an OpenRouter account."
                                steps={[
                                    'Sign up at openrouter.ai',
                                    'Get an API key and add credits',
                                    'Enter the key and model name (e.g. openai/gpt-4o) when running a test',
                                ]}
                            />
                            <ProviderCard
                                icon={Monitor}
                                color="slate"
                                name="Ollama"
                                desc="Runs an AI model directly on your own computer. Your data never leaves your machine — no API key or costs required."
                                best="Best if you care about privacy, want zero API costs, or are testing something sensitive."
                                steps={[
                                    'Install Ollama from ollama.com',
                                    'Download a model: run ollama pull llama3 in your terminal',
                                    'Make sure Ollama is running before starting a test',
                                ]}
                            />
                        </div>
                    </section>

                    {/* ── READING RESULTS ── */}
                    <section id="reading-results" className="space-y-6 scroll-mt-20">
                        <SectionHeading number="06" title="Reading results" />
                        <p className="text-slate-600 leading-relaxed">
                            Once a test finishes, you get two views of the results: sessions and the full report.
                        </p>

                        <div className="space-y-4">
                            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                        <Users className="h-4 w-4 text-indigo-500" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-900">Sessions — what each AI user did</p>
                                </div>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    Each AI user gets its own session page. You can see every step it took, what it was thinking at each point, what emotion it had (confused, confident, frustrated), and a live browser view of what the page looked like.
                                </p>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    This is useful when you want to understand <em>why</em> a user got stuck — not just that they did.
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                                        <BarChart3 className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-900">Report — the full picture</p>
                                </div>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    The report combines all sessions into one document. It includes a UX score, a breakdown of how each user type performed, a list of the specific problems found (and where), and AI-written recommendations for what to fix.
                                </p>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    You can export the report as a PDF to share with your team.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">What's in the report</p>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {[
                                    { label: 'UX score', desc: 'A 0–100 score that summarises how smooth the overall experience was across all AI users.' },
                                    { label: 'Results by user type', desc: 'How each type of user (e.g. first-time visitor vs. power user) experienced your site separately.' },
                                    { label: 'Problem moments', desc: 'Specific points in the experience where users got confused, slowed down, or gave up — with step numbers and page context.' },
                                    { label: 'AI analysis', desc: 'A plain-English write-up of what worked, what didn\'t, and what to prioritise fixing.' },
                                ].map(({ label, desc }) => (
                                    <div key={label} className="px-5 py-4 flex gap-4">
                                        <div className="flex-shrink-0 mt-0.5">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">{label}</p>
                                            <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── FAQ ── */}
                    <section id="faq" className="space-y-6 scroll-mt-20">
                        <SectionHeading number="07" title="FAQ" />
                        <div className="space-y-px">
                            {[
                                {
                                    q: 'How long does a test take?',
                                    a: 'It depends on how many AI users you run and which AI provider you use. A single user on Gemini usually finishes in 2–5 minutes. Running 5 users might take 10–20 minutes. You can watch progress live on the session page.',
                                },
                                {
                                    q: 'Can I test a site that requires a login?',
                                    a: 'Yes. When setting up a test, turn on the "Requires login" option and enter a test account\'s email and password. Specter will log in automatically before the AI user starts browsing. Use a test account — not your real account.',
                                },
                                {
                                    q: 'Does the AI user actually click on my real site?',
                                    a: 'Yes. Specter opens a real browser and interacts with your site the same way a human would. If your site has a contact form, the AI user might fill it out. Use a test environment or be aware that actions taken are real.',
                                },
                                {
                                    q: 'What\'s the difference between a test run and a session?',
                                    a: 'A test run is the whole test — it includes all the AI users you set up. Each AI user gets its own session, which is a recording of everything that one user did from start to finish.',
                                },
                                {
                                    q: 'Do I need a credit card to try Specter?',
                                    a: 'No. The free plan lets you run 3 tests with no credit card required. You only need to sign up.',
                                },
                                {
                                    q: 'Can I run Specter without sending data to any cloud AI?',
                                    a: 'Yes. Use the Ollama option — it runs an AI model locally on your own computer. Nothing leaves your machine. You\'ll need to install Ollama and download a model first (see the "Choosing an AI" section above).',
                                },
                            ].map(({ q, a }, i) => (
                                <div key={i} className="py-5 border-b border-slate-100 last:border-0">
                                    <p className="text-sm font-semibold text-slate-900 mb-2">{q}</p>
                                    <p className="text-sm text-slate-500 leading-relaxed">{a}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ── BOTTOM CTA ── */}
                    <div className="rounded-2xl bg-indigo-600 p-10 text-center space-y-5">
                        <h2 className="text-2xl font-bold text-white">Ready to run your first test?</h2>
                        <p className="text-indigo-200 text-sm leading-relaxed">
                            It takes about 5 minutes to set up. No credit card required.
                        </p>
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm"
                        >
                            Go to dashboard
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                </div>
            </main>
        </div>
    );
}

function SectionHeading({ number, title }: { number: string; title: string }) {
    return (
        <div className="flex items-baseline gap-3">
            <span className="text-xs font-bold text-indigo-400 tabular-nums">{number}</span>
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        </div>
    );
}

function StepCard({ step, title, desc, note }: { step: string; title: string; desc: string; note: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
            <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{step}</span>
            </div>
            <p className="text-base font-semibold text-slate-900">{title}</p>
            <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
                <p className="text-xs text-slate-500 leading-relaxed"><strong className="text-slate-700">Note:</strong> {note}</p>
            </div>
        </div>
    );
}

function ProviderCard({
    icon: Icon,
    color,
    name,
    tag,
    desc,
    best,
    steps,
}: {
    icon: any;
    color: 'indigo' | 'emerald' | 'slate';
    name: string;
    tag?: string;
    desc: string;
    best: string;
    steps: string[];
}) {
    const colors = {
        indigo: { bg: 'bg-indigo-50', border: 'border-indigo-100', icon: 'text-indigo-500', tag: 'bg-indigo-100 text-indigo-600' },
        emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'text-emerald-500', tag: 'bg-emerald-100 text-emerald-600' },
        slate: { bg: 'bg-slate-100', border: 'border-slate-200', icon: 'text-slate-500', tag: 'bg-slate-100 text-slate-600' },
    }[color];

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${colors.icon}`} />
                </div>
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{name}</p>
                    {tag && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.tag}`}>{tag}</span>
                    )}
                </div>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            <p className="text-xs text-slate-400 italic">{best}</p>
            <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">How to set up</p>
                {steps.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                        <span className="flex-shrink-0 h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 mt-0.5">
                            {i + 1}
                        </span>
                        <p className="text-sm text-slate-600">{s}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
