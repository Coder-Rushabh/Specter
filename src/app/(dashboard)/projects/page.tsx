import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Globe, Plus, ArrowRight, ExternalLink, Settings2, BarChart3 } from 'lucide-react';

export default async function ProjectsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = await createClient();

  const { data: projectsRaw } = await supabase
    .from('projects')
    .select(`
      *,
      test_runs (
        count
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const projects = (projectsRaw || []).map((p: any) => ({
    ...p,
    testRunsCount: p.test_runs?.[0]?.count || 0,
  }));

  return (
    <div className="animate-in fade-in space-y-8 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Your Projects</h1>
          <p className="text-sm text-slate-500">
            Each project is a website you want to test with AI users.
          </p>
        </div>
        <Link
          href="/projects/new/setup"
          className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white transition-all active:scale-95 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Project
        </Link>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {projects.length > 0 ? (
          projects.map((project) => (
            <div
              key={project.id}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-indigo-200 hover:shadow-md"
            >
              <div className="mb-5 flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-500">
                  <Globe className="h-5 w-5" />
                </div>
                <button className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all">
                  <Settings2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5 mb-5">
                <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {project.name}
                </h3>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <ExternalLink className="h-3 w-3" />
                  <span className="text-xs truncate max-w-[200px]">{project.target_url}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-4 border-t border-slate-100">
                <div className="space-y-0.5">
                  <p className="text-xs text-slate-400">Test Runs</p>
                  <p className="text-lg font-bold text-slate-900">{project.testRunsCount}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-slate-400">AI Model</p>
                  <p className="text-sm font-semibold text-indigo-600 capitalize">{project.llm_provider || 'gemini'}</p>
                </div>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2.5">
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Overview
                </Link>
                <Link
                  href={`/projects/${project.id}/setup`}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 text-white py-2.5 text-xs font-medium transition-all hover:bg-indigo-700"
                >
                  New Run
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-5 border border-slate-200">
              <Globe className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-2">No projects yet</h3>
            <p className="max-w-[280px] text-sm text-slate-500 leading-relaxed mb-6">
              Add your first website to start testing it with AI users.
            </p>
            <Link
              href="/projects/new/setup"
              className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all shadow-sm"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
