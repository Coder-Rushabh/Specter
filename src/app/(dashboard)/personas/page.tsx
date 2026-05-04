import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Users, BrainCircuit, Target, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const PAGE_SIZE = 9;

export default async function PersonasPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>;
}) {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const { page: pageParam } = await searchParams;
    const page = Math.max(1, parseInt(pageParam || '1', 10));
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const supabase = await createClient();

    const { data: personas, count } = await supabase
        .from('persona_configs')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);

    const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

    return (
        <div className="animate-in fade-in space-y-8 duration-500">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">AI Users</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Simulated users that test your website. Each one has a different goal and skill level.
                    </p>
                </div>
                {count !== null && count > 0 && (
                    <span className="text-xs text-slate-400 flex-shrink-0">
                        {count} {count === 1 ? 'user' : 'users'} total
                    </span>
                )}
            </div>

            {/* ── Grid ── */}
            {personas && personas.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {personas.map((persona) => {
                            const literacy = persona.tech_literacy?.toLowerCase();
                            const accentColor = literacy === 'high' ? 'indigo' : literacy === 'low' ? 'amber' : 'emerald';
                            const literacyLabel = literacy === 'high' ? 'High' : literacy === 'low' ? 'Low' : 'Medium';
                            const colorClasses = {
                                indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600' },
                                amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600' },
                                emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600' },
                            }[accentColor];

                            return (
                                <div
                                    key={persona.id}
                                    className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-indigo-200 hover:shadow-sm"
                                >
                                    {/* Top row */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center border flex-shrink-0 ${colorClasses.bg} ${colorClasses.border}`}>
                                            <BrainCircuit className={`h-5 w-5 ${colorClasses.text}`} />
                                        </div>
                                        <span className="text-xs text-slate-400">
                                            {new Date(persona.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>

                                    {/* Name */}
                                    <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors mb-3">
                                        {persona.name}
                                    </h3>

                                    {/* Goal */}
                                    <div className="flex-1 p-3.5 rounded-xl bg-slate-50 border border-slate-100 mb-4">
                                        <p className="text-xs font-medium text-slate-400 mb-1.5">Goal</p>
                                        <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                                            {persona.goal_prompt}
                                        </p>
                                    </div>

                                    {/* Meta */}
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Target className="h-3 w-3 text-slate-400" />
                                                <span className="text-xs text-slate-400">Tech skill</span>
                                            </div>
                                            <span className={`text-sm font-semibold ${colorClasses.text}`}>
                                                {literacyLabel}
                                            </span>
                                        </div>
                                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <UserCheck className="h-3 w-3 text-slate-400" />
                                                <span className="text-xs text-slate-400">Familiarity</span>
                                            </div>
                                            <span className="text-sm font-semibold text-slate-700 truncate block">
                                                {persona.domain_familiarity || 'General'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Pagination ── */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <p className="text-xs text-slate-400">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex items-center gap-2">
                                <Link
                                    href={`?page=${page - 1}`}
                                    aria-disabled={page <= 1}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                        page <= 1
                                            ? 'border-slate-100 bg-slate-50 text-slate-300 pointer-events-none'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600'
                                    }`}
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                    Previous
                                </Link>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                        <Link
                                            key={p}
                                            href={`?page=${p}`}
                                            className={`h-7 w-7 flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
                                                p === page
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
                                            }`}
                                        >
                                            {p}
                                        </Link>
                                    ))}
                                </div>

                                <Link
                                    href={`?page=${page + 1}`}
                                    aria-disabled={page >= totalPages}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                        page >= totalPages
                                            ? 'border-slate-100 bg-slate-50 text-slate-300 pointer-events-none'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600'
                                        }`}
                                >
                                    Next
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center space-y-4 rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center">
                    <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                        <Users className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div className="space-y-1.5">
                        <h3 className="text-sm font-semibold text-slate-900">No AI users yet</h3>
                        <p className="text-sm text-slate-500 max-w-[260px] mx-auto leading-relaxed">
                            AI users are created automatically when you run a test.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
