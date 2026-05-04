'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Zap, Clock, Plus, ArrowRight, CheckCircle2, XCircle, Activity, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

interface TestRun {
    id: string;
    projectName: string;
    url: string;
    status: string;
    date: string;
    totalSessions: number;
    completedSessions: number;
}

export function TestRunsList({ testRuns }: { testRuns: TestRun[] }) {
    const [page, setPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(testRuns.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageRuns = testRuns.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    const start = testRuns.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
    const end = Math.min(safePage * PAGE_SIZE, testRuns.length);

    if (testRuns.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center space-y-4 rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center">
                <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-indigo-500" />
                </div>
                <div className="space-y-1.5">
                    <h3 className="text-sm font-semibold text-slate-900">No test runs yet</h3>
                    <p className="text-sm text-slate-500 max-w-[260px] mx-auto leading-relaxed">
                        Run a test on your website to see results here.
                    </p>
                </div>
                <Link
                    href="/projects/new/setup"
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white transition-all"
                >
                    <Plus className="h-4 w-4" />
                    Run your first test
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* List */}
            <div className="space-y-2">
                {pageRuns.map((run) => {
                    const isCompleted = run.status === 'completed';
                    const isFailed = run.status === 'failed';
                    const isRunning = run.status === 'running';
                    const StatusIcon = isCompleted ? CheckCircle2 : isFailed ? XCircle : isRunning ? Activity : Clock;
                    const statusClass = isCompleted
                        ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                        : isFailed
                        ? 'text-red-600 bg-red-50 border-red-200'
                        : isRunning
                        ? 'text-blue-600 bg-blue-50 border-blue-200'
                        : 'text-slate-500 bg-slate-50 border-slate-200';
                    const statusLabel = isCompleted ? 'Completed' : isFailed ? 'Failed' : isRunning ? 'Running' : 'Pending';
                    const accentClass = isCompleted ? 'bg-emerald-500' : isFailed ? 'bg-red-500' : isRunning ? 'bg-blue-500' : 'bg-slate-300';

                    return (
                        <Link
                            key={run.id}
                            href={`/test-runs/${run.id}`}
                            className="group relative flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 transition-all hover:border-indigo-200 hover:shadow-sm overflow-hidden"
                        >
                            <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${accentClass}`} />

                            <div className="flex items-center gap-4 pl-2">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                                    isCompleted ? 'bg-emerald-50 border-emerald-200' :
                                    isFailed ? 'bg-red-50 border-red-200' :
                                    isRunning ? 'bg-blue-50 border-blue-200' :
                                    'bg-slate-50 border-slate-200'
                                }`}>
                                    <Zap className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''} ${
                                        isCompleted ? 'text-emerald-500' :
                                        isFailed ? 'text-red-500' :
                                        isRunning ? 'text-blue-500' :
                                        'text-slate-400'
                                    }`} />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                        {run.projectName}
                                    </p>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <span className="flex items-center gap-1 text-xs text-slate-400">
                                            <Clock className="h-3 w-3" />
                                            {run.date}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mt-3 sm:mt-0 pl-2 sm:pl-0 flex-shrink-0">
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-700">
                                        {run.completedSessions}/{run.totalSessions}
                                    </p>
                                    <p className="text-xs text-slate-400">users done</p>
                                </div>

                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${statusClass}`}>
                                    <StatusIcon className={`h-3.5 w-3.5 ${isRunning ? 'animate-pulse' : ''}`} />
                                    {statusLabel}
                                </div>

                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Pagination */}
            {testRuns.length > PAGE_SIZE && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-slate-500">
                        Showing <span className="text-slate-900 font-semibold">{start}–{end}</span> of{' '}
                        <span className="text-slate-900 font-semibold">{testRuns.length}</span> runs
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={safePage === 1}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Prev
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`h-8 w-8 rounded-lg text-sm font-bold transition-all ${
                                        p === safePage
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={safePage === totalPages}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
