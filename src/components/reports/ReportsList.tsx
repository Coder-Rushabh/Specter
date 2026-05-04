'use client';

import { useState, useMemo } from 'react';
import { Search, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReportCard } from './ReportCard';
import { ScrollToTop } from './ScrollToTop';

const PAGE_SIZE = 6;

interface Report {
    id: string;
    projectName: string;
    url: string;
    completedAt: string;
    usabilityScore: number;
    frictionLevel: string;
    funnelRate: number;
    sessionCount: number;
}

interface ReportsListProps {
    initialReports: Report[];
}

export function ReportsList({ initialReports }: ReportsListProps) {
    const [reports, setReports] = useState(initialReports);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMode, setFilterMode] = useState<'all' | 'high' | 'low'>('all');
    const [page, setPage] = useState(1);

    const handleDelete = (id: string) => {
        setReports(prev => prev.filter(r => r.id !== id));
        // If we just deleted the last item on this page, go back one
        setPage(prev => Math.max(1, prev));
    };

    const filteredReports = useMemo(() => {
        setPage(1); // reset to page 1 whenever search/filter changes
        return reports.filter(report => {
            const matchesSearch =
                report.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                report.url.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter =
                filterMode === 'all' ||
                (filterMode === 'high' && report.usabilityScore >= 70) ||
                (filterMode === 'low' && report.usabilityScore < 50);
            return matchesSearch && matchesFilter;
        });
    }, [reports, searchQuery, filterMode]);

    const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageReports = filteredReports.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    const start = filteredReports.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
    const end = Math.min(safePage * PAGE_SIZE, filteredReports.length);

    return (
        <div className="space-y-5">
            {/* ── Search + filters ── */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search by project or URL..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 bg-white border border-slate-200 rounded-xl pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                </div>

                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-1">
                    {([
                        { key: 'all', label: 'All' },
                        { key: 'high', label: 'Good score' },
                        { key: 'low', label: 'Needs work' },
                    ] as const).map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilterMode(key)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterMode === key
                                    ? key === 'high' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : key === 'low' ? 'bg-red-50 text-red-700 border border-red-200'
                                            : 'bg-slate-900 text-white border border-slate-900'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pageReports.length > 0 ? (
                    pageReports.map(report => (
                        <ReportCard key={report.id} report={report} onDelete={handleDelete} />
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center space-y-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center">
                        <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-slate-400" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">No reports found</h3>
                            <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filter.</p>
                        </div>
                        <button
                            onClick={() => { setSearchQuery(''); setFilterMode('all'); }}
                            className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </div>

            {/* ── Pagination ── */}
            {filteredReports.length > PAGE_SIZE && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-slate-500">
                        Showing <span className="text-slate-900 font-semibold">{start}–{end}</span> of{' '}
                        <span className="text-slate-900 font-semibold">{filteredReports.length}</span> reports
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
                                    className={`h-8 w-8 rounded-lg text-sm font-bold transition-all ${p === safePage
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
