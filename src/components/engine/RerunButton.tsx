'use client';

import { useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { rerunTestRun } from '@/app/(dashboard)/test-runs/actions';

interface RerunButtonProps {
    runId: string;
}

export function RerunButton({ runId }: RerunButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleRerun = async () => {
        if (!confirm('Are you sure you want to rerun this test cohort? This will create a fresh set of sessions.')) return;

        setLoading(true);
        try {
            await rerunTestRun(runId);
        } catch (err: any) {
            if (err.message === 'NEXT_REDIRECT' || err.message?.includes('NEXT_REDIRECT')) {
                return;
            }
            console.error(err);
            alert('Failed to rerun test. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleRerun}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 text-sm font-medium transition-all active:scale-95"
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <RefreshCw className="h-4 w-4" />
            )}
            {loading ? 'Rerunning...' : 'Rerun'}
        </button>
    );
}
