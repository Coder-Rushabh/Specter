'use client';

import { useState, useEffect } from 'react';
import { Globe, Zap, Plus, Check, ArrowLeft, User as UserIcon, Users, Loader2, Sparkles, X, ShoppingCart, Home, Settings, Target } from 'lucide-react';
import Link from 'next/link';
import { createTestRun, generateAIPersonas, suggestAudienceArchetypes } from '../../actions';
import { SAMPLE_PERSONAS } from '@/lib/constants/personas';
import type { Persona as SamplePersona } from '@/lib/constants/personas';

type Step = 1 | 2 | 3;
interface Persona {
  id: number;
  name: string;
  geolocation: string;
  ageRange: string;
  techLiteracy: string;
  domainFamiliarity: string;
  prompt: string;
  personaCount: number;
}

interface DynamicArchetype {
  id: string;
  icon_type: 'users' | 'zap' | 'user' | 'check' | 'globe' | 'x' | 'shopping-cart' | 'home' | 'settings';
  desc: string;
}

const ICON_MAP: Record<string, any> = {
  users: Users,
  zap: Zap,
  user: UserIcon,
  check: Check,
  globe: Globe,
  x: X,
  'shopping-cart': ShoppingCart,
  home: Home,
  settings: Settings,
};

export default function NewTestRunPage() {
  const [step, setStep] = useState<Step>(1);
  const [url, setUrl] = useState('');
  const [scope, setScope] = useState('');

  const [requiresAuth, setRequiresAuth] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [llmProvider, setLlmProvider] = useState<'gemini' | 'openrouter' | 'ollama'>('gemini');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmModelName, setLlmModelName] = useState('');
  const [personaPrompt, setPersonaPrompt] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);

  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [personas, setPersonas] = useState<Persona[]>([
    {
      id: 1,
      name: 'Skeptical Founder',
      geolocation: 'United States',
      ageRange: '25-40',
      techLiteracy: 'High',
      domainFamiliarity: 'SaaS & DevTools',
      prompt: 'Looking for pricing first, skeptical of marketing claims.',
      personaCount: 1,
    },
  ]);
  const [selectedPersonaId, setSelectedPersonaId] = useState(1);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiStep, setAiStep] = useState<'pending' | 'editor'>('pending');

  useEffect(() => {
    if (step === 2 && aiStep === 'pending' && !isAnalyzing && !isGenerating) {
      autoGenerateCohort();
    }
  }, [step]);

  const autoGenerateCohort = async () => {
    setIsAnalyzing(true);
    setIsGenerating(false);
    setError(null);
    try {
      const archetypes = await suggestAudienceArchetypes({
        url,
        llmProvider,
        llmApiKey: llmApiKey || undefined,
        llmModelName: llmModelName || undefined,
      });
      const archetypeIds = (archetypes as any[]).map((a: any) => a.id);

      setIsAnalyzing(false);
      setIsGenerating(true);
      const generated = await generateAIPersonas({
        url,
        archetypes: archetypeIds,
        userPrompt: personaPrompt,
        llmProvider,
        llmApiKey: llmApiKey || undefined,
        llmModelName: llmModelName || undefined,
      });
      setPersonas(generated as any);
      setSelectedPersonaId((generated as any)[0]?.id || 1);
      setAiStep('editor');
    } catch (err: any) {
      setError(err.message || 'Auto-generation failed. You can add users manually below.');
      setAiStep('editor');
    } finally {
      setIsAnalyzing(false);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId) || personas[0];

  const updatePersona = (id: number, field: keyof Persona, value: string | number) => {
    setPersonas(personas.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const addPersona = () => {
    if (personas.length < 5) {
      const newId = Math.max(...personas.map((p) => p.id), 0) + 1;
      const newPersona: Persona = {
        id: newId,
        name: 'New User',
        geolocation: '',
        ageRange: '',
        techLiteracy: 'Medium',
        domainFamiliarity: '',
        prompt: '',
        personaCount: 1,
      };
      setPersonas([...personas, newPersona]);
      setSelectedPersonaId(newId);
    }
  };

  const addFromLibrary = (sample: SamplePersona) => {
    if (personas.length < 5) {
      const newId = Math.max(...personas.map((p) => p.id), 0) + 1;
      const newPersona: Persona = {
        id: newId,
        name: sample.name,
        geolocation: sample.geolocation,
        ageRange: sample.ageRange,
        techLiteracy: sample.techLiteracy,
        domainFamiliarity: sample.domainFamiliarity,
        prompt: sample.prompt,
        personaCount: 1,
      };
      setPersonas([...personas, newPersona]);
      setSelectedPersonaId(newId);
      setShowLibrary(false);
    }
  };

  const removePersona = (id: number) => {
    if (personas.length > 1) {
      const updatedPersonas = personas.filter((p) => p.id !== id);
      setPersonas(updatedPersonas);
      if (selectedPersonaId === id) {
        setSelectedPersonaId(updatedPersonas[0].id);
      }
    }
  };

  const handleLaunch = async () => {
    setIsLaunching(true);
    setError(null);
    try {
      await createTestRun({
        url,
        scope,
        requiresAuth,
        executionMode: 'autonomous',
        llmProvider,
        llmApiKey: llmApiKey || undefined,
        llmModelName: llmModelName || undefined,
        credentials: requiresAuth ? { username, password } : undefined,
        personas
      });
    } catch (err: any) {
      if (err.message === 'NEXT_REDIRECT' || err.digest?.startsWith('NEXT_REDIRECT')) {
        throw err;
      }
      setError(err.message || 'Failed to start test run. Please check your connection.');
      setIsLaunching(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 flex min-h-full flex-col items-center pt-8 pb-20 duration-500">

      {/* ── Step Indicator ── */}
      <div className="relative mb-16 flex w-full max-w-lg items-center justify-between px-4">
        {/* Connection line */}
        <div className="absolute left-[12%] right-[12%] top-5 -z-10 h-px bg-slate-200">
          <div
            className="h-full bg-indigo-500 transition-all duration-700 ease-in-out"
            style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
          />
        </div>

        {[
          { num: 1, label: 'Website' },
          { num: 2, label: 'AI Users' },
          { num: 3, label: 'Launch' },
        ].map(({ num, label }) => (
          <div key={num} className="flex flex-col items-center gap-2.5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
              step > num
                ? 'bg-indigo-600 text-white'
                : step === num
                ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                : 'bg-white border-2 border-slate-200 text-slate-400'
            }`}>
              {step > num ? <Check className="h-4 w-4" strokeWidth={2.5} /> : num}
            </div>
            <span className={`text-xs font-medium transition-colors ${step >= num ? 'text-slate-700' : 'text-slate-400'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Step 1: Website ── */}
      {step === 1 && (
        <div className="flex w-full max-w-2xl flex-col items-center space-y-8 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Which website do you want to test?</h1>
            <p className="text-slate-500">
              Enter the URL and Specter will send AI users to explore it.
            </p>
          </div>

          <div className="w-full space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

            <div className="space-y-2.5 text-left">
              <div className="flex items-center gap-2.5">
                <Globe className="h-4 w-4 text-indigo-500" />
                <label className="text-sm font-medium text-slate-700">Website URL <span className="text-red-400">*</span></label>
              </div>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                placeholder="https://yourapp.com"
              />
            </div>

            <div className="space-y-2.5 text-left">
              <div className="flex items-center gap-2.5">
                <Target className="h-4 w-4 text-indigo-500" />
                <label className="text-sm font-medium text-slate-700">Focus area <span className="text-slate-400 text-xs font-normal">(optional)</span></label>
              </div>
              <textarea
                rows={3}
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                placeholder="e.g. Focus on user onboarding and payment flows, ignore the help center."
              />
            </div>

            {/* AI Model Selection */}
            <div className="space-y-3 text-left pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2.5">
                <Zap className="h-4 w-4 text-indigo-500" />
                <label className="text-sm font-medium text-slate-700">AI Model</label>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'gemini', label: 'Gemini', sub: 'Google Flash 2.0 · Free' },
                  { id: 'openrouter', label: 'OpenRouter', sub: '100+ vision models' },
                  { id: 'ollama', label: 'Local', sub: 'Ollama · No API needed' },
                ].map(({ id, label, sub }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setLlmProvider(id as any); if (id !== 'openrouter') { setLlmApiKey(''); if (id !== 'ollama') setLlmModelName(''); } }}
                    className={`flex flex-col items-start gap-1.5 p-3.5 rounded-xl border transition-all text-left ${llmProvider === id ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-100' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                  >
                    <span className="text-sm font-semibold text-slate-900">{label}</span>
                    <span className="text-xs text-slate-400 leading-tight">{sub}</span>
                  </button>
                ))}
              </div>

              {llmProvider === 'openrouter' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-600">Model ID</label>
                      <a
                        href="https://openrouter.ai/models?fmt=cards&input_modalities=image"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        Browse models ↗
                      </a>
                    </div>
                    <input
                      type="text"
                      value={llmModelName}
                      onChange={(e) => setLlmModelName(e.target.value)}
                      placeholder="e.g. anthropic/claude-3-5-sonnet"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">OpenRouter API Key</label>
                    <input
                      type="password"
                      value={llmApiKey}
                      onChange={(e) => setLlmApiKey(e.target.value)}
                      placeholder="sk-or-v1-••••••••••••••••••••"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Custom persona instructions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">Guide the AI users <span className="text-slate-400 font-normal">(optional)</span></label>
                </div>
                <textarea
                  value={personaPrompt}
                  onChange={(e) => setPersonaPrompt(e.target.value)}
                  placeholder="e.g. Focus on first-time users who are non-technical, aged 40+..."
                  rows={3}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none text-sm"
                />
                <p className="text-xs text-slate-400">
                  Guide the AI when creating test users. Leave blank to let it decide automatically.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                let targetUrl = url.trim();
                if (!targetUrl) {
                  setError('Please enter a website URL.');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  return;
                }

                if (!targetUrl.startsWith('http')) {
                  targetUrl = `https://${targetUrl}`;
                }

                try {
                  const parsed = new URL(targetUrl);
                  if (!parsed.hostname.includes('.')) {
                    throw new Error('Invalid hostname');
                  }
                  setUrl(parsed.href);
                } catch (e) {
                  setError('Please enter a valid URL (e.g., https://example.com)');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  return;
                }

                if (llmProvider === 'openrouter') {
                  if (!llmModelName.trim()) {
                    setError('Please enter a model ID for OpenRouter.');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    return;
                  }
                  if (!llmApiKey.trim()) {
                    setError('Please enter your OpenRouter API key.');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    return;
                  }
                }

                setStep(2);
              }}
              className="w-full py-3.5 mt-2 rounded-xl bg-indigo-600 text-white font-semibold flex items-center justify-center gap-2.5 transition-all hover:bg-indigo-700 active:scale-[0.99] shadow-sm"
            >
              Set up AI users
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: AI Users ── */}
      {step === 2 && (
        <div className="w-full max-w-5xl flex flex-col items-center space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Set up your AI users</h1>
            <p className="text-slate-500">
              {isAnalyzing || isGenerating ? 'Specter is scanning your site and creating AI users...' : 'Review and edit the AI-generated users. (Max 5)'}
            </p>
          </div>

          {(isAnalyzing || isGenerating) ? (
            <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl p-10 shadow-sm animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-col items-center justify-center py-16 space-y-5">
                <div className="relative">
                  <Loader2 className="h-14 w-14 animate-spin text-slate-200" />
                  <Sparkles className="absolute inset-0 m-auto h-7 w-7 text-indigo-500 animate-pulse" />
                </div>
                <div className="space-y-1.5 text-center">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {isAnalyzing ? 'Scanning your site...' : 'Creating AI users...'}
                  </h2>
                  <p className="text-slate-400 text-sm">
                    {isAnalyzing
                      ? `Analyzing ${(() => { try { return new URL(url).hostname; } catch { return url; } })()} to understand your audience`
                      : 'Generating users based on your site context'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStep(1)}
                className="w-full pt-4 text-slate-400 text-sm hover:text-slate-700 transition-colors"
              >
                ← Cancel
              </button>
            </div>
          ) : (
            <>
              <div className="w-full flex gap-6 items-start">
                {/* Sidebar List */}
                <div className="w-64 flex flex-col gap-3 sticky top-8">
                  <div className="text-xs font-medium text-slate-500 px-1">Your AI users</div>
                  <div className="space-y-1.5">
                    {personas.map((p, idx) => (
                      <div key={p.id} className="group relative">
                        <button
                          onClick={() => setSelectedPersonaId(p.id)}
                          className={`w-full text-left px-3.5 py-3 rounded-xl border flex items-center gap-3 transition-all ${
                            selectedPersonaId === p.id
                              ? 'bg-indigo-50 border-indigo-200 text-slate-900 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                          }`}
                        >
                          <span className={`min-w-[22px] h-5.5 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 flex items-center justify-center ${
                            selectedPersonaId === p.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium truncate">{p.name}</span>
                        </button>
                        {personas.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removePersona(p.id);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}

                    <div className="pt-1.5 space-y-1.5">
                      <button
                        onClick={() => setShowLibrary(true)}
                        className="w-full p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center gap-2 transition-all text-sm font-medium"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Browse library
                      </button>

                      {personas.length < 5 && (
                        <button
                          onClick={addPersona}
                          className="w-full p-3 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700 flex items-center justify-center gap-2 transition-all text-sm"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add user
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => { setAiStep('pending'); autoGenerateCohort(); }}
                    className="w-full py-2.5 text-indigo-500 text-xs font-medium hover:text-indigo-700 transition-colors"
                  >
                    ↺ Regenerate
                  </button>
                </div>

                {/* Editor */}
                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-7 space-y-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="space-y-0.5">
                      <h2 className="text-base font-semibold text-slate-900">Edit user</h2>
                      <p className="text-xs text-slate-400">Adjust profile and behavior</p>
                    </div>
                    <div className="bg-slate-100 px-2 py-1 rounded text-xs font-medium text-slate-500">
                      #{selectedPersona.id}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5 text-left">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">User type name</label>
                      <input
                        type="text"
                        value={selectedPersona.name}
                        onChange={(e) => updatePersona(selectedPersona.id, 'name', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">Location</label>
                      <input
                        type="text"
                        value={selectedPersona.geolocation}
                        placeholder="e.g. United States"
                        onChange={(e) => updatePersona(selectedPersona.id, 'geolocation', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">Age range</label>
                      <input
                        type="text"
                        value={selectedPersona.ageRange}
                        placeholder="e.g. 22-35"
                        onChange={(e) => updatePersona(selectedPersona.id, 'ageRange', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">Tech skill level</label>
                      <select
                        value={selectedPersona.techLiteracy}
                        onChange={(e) => updatePersona(selectedPersona.id, 'techLiteracy', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none text-sm"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-600">Run count</label>
                        <span className="text-xs text-slate-400">How many run in parallel</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={selectedPersona.personaCount}
                          onChange={(e) => updatePersona(selectedPersona.id, 'personaCount', parseInt(e.target.value) || 1)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
                        />
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-slate-200">
                          <Users className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-xs font-medium text-slate-600">App familiarity</label>
                      <input
                        type="text"
                        value={selectedPersona.domainFamiliarity}
                        placeholder="e.g. Familiar with SaaS tools"
                        onChange={(e) => updatePersona(selectedPersona.id, 'domainFamiliarity', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-xs font-medium text-slate-600">Goal & behavior</label>
                      <textarea
                        rows={4}
                        value={selectedPersona.prompt}
                        placeholder="e.g. Skeptical budget-cutter looking for pricing first"
                        onChange={(e) => updatePersona(selectedPersona.id, 'prompt', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full flex flex-col gap-3 pt-2">
                {error && (
                  <div className="w-full p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={isLaunching}
                    onClick={() => { setStep(1); setAiStep('pending'); setError(null); }}
                    className="px-6 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    disabled={isLaunching}
                    onClick={handleLaunch}
                    className="py-3.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLaunching ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Starting test...
                      </>
                    ) : (
                      <>
                        Start test run
                        <Zap className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── User Library Modal ── */}
      {showLibrary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[85vh] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">User Library</h2>
                  <p className="text-xs text-slate-400">Ready-to-use AI user profiles.</p>
                </div>
              </div>
              <button
                onClick={() => setShowLibrary(false)}
                className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SAMPLE_PERSONAS.map((sample) => (
                  <div
                    key={sample.id}
                    className="group p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer relative"
                    onClick={() => addFromLibrary(sample)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{sample.name}</h3>
                        <p className="text-xs text-slate-400">{sample.description}</p>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-xs font-medium border flex-shrink-0 ml-3 ${
                        sample.techLiteracy === 'High' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                        sample.techLiteracy === 'Low' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                          'bg-blue-50 border-blue-200 text-blue-700'}`}>
                        {sample.techLiteracy}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Globe className="h-3 w-3" />
                        <span>{sample.geolocation}</span>
                        <span>·</span>
                        <span>{sample.ageRange} years</span>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500 leading-relaxed">
                        &ldquo;{sample.prompt.slice(0, 120)}...&rdquo;
                      </div>
                    </div>

                    <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                      <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center shadow-sm">
                        <Plus className="h-3.5 w-3.5 text-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
              <p className="text-xs text-slate-400">
                Click a user to add them to your test
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 10px; }
      `}</style>
    </div>
  );
}
