'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FolderOpen, FlaskConical, Users } from 'lucide-react';

interface LiveDashboardStatsProps {
    initialStats: {
        projectsCount: number;
        runsCount: number;
        personasCount: number;
    };
    userId: string;
}

export function LiveDashboardStats({ initialStats, userId }: LiveDashboardStatsProps) {
    const [stats, setStats] = useState(initialStats);
    const supabase = createClient();

    useEffect(() => {
        const fetchLatestStats = async () => {
            const { count: projectsCount } = await supabase
                .from('projects')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            const { count: runsCount } = await supabase
                .from('test_runs')
                .select('*, projects!inner(*)', { count: 'exact', head: true })
                .eq('projects.user_id', userId);

            const { count: personasCount } = await supabase
                .from('persona_sessions')
                .select('*, test_runs!inner(*, projects!inner(*))', { count: 'exact', head: true })
                .eq('test_runs.projects.user_id', userId);

            setStats({
                projectsCount: projectsCount || 0,
                runsCount: runsCount || 0,
                personasCount: personasCount || 0
            });
        };

        const projectsSub = supabase
            .channel('dashboard_projects')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${userId}` }, fetchLatestStats)
            .subscribe();

        const runsSub = supabase
            .channel('dashboard_runs')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'test_runs' }, fetchLatestStats)
            .subscribe();

        const sessionsSub = supabase
            .channel('dashboard_sessions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'persona_sessions' }, fetchLatestStats)
            .subscribe();

        return () => {
            supabase.removeChannel(projectsSub);
            supabase.removeChannel(runsSub);
            supabase.removeChannel(sessionsSub);
        };
    }, [userId, supabase]);

    const statConfig = [
        {
            label: 'Projects',
            sub: 'Websites being tested',
            value: stats.projectsCount,
            icon: FolderOpen,
            iconBg: 'bg-indigo-50 border-indigo-100',
            iconColor: 'text-indigo-500',
            valueColor: 'text-slate-900',
        },
        {
            label: 'Test Runs',
            sub: 'Total tests executed',
            value: stats.runsCount,
            icon: FlaskConical,
            iconBg: 'bg-emerald-50 border-emerald-100',
            iconColor: 'text-emerald-500',
            valueColor: 'text-slate-900',
        },
        {
            label: 'AI Users',
            sub: 'Simulated users run',
            value: stats.personasCount,
            icon: Users,
            iconBg: 'bg-amber-50 border-amber-100',
            iconColor: 'text-amber-500',
            valueColor: 'text-slate-900',
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {statConfig.map((stat) => (
                <div
                    key={stat.label}
                    className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-indigo-200 hover:shadow-sm"
                >
                    <div className="flex items-start justify-between mb-5">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">{stat.label}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
                        </div>
                        <div className={`h-9 w-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${stat.iconBg}`}>
                            <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                        </div>
                    </div>
                    <p className={`text-3xl font-bold tracking-tight ${stat.valueColor}`}>
                        {stat.value}
                    </p>
                </div>
            ))}
        </div>
    );
}
