import { createAdminClient } from './src/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

// Manually load .env.local
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
            const value = valueParts.join('=').replace(/^['"]|['"]$/g, '');
            process.env[key.trim()] = value;
        }
    });
} catch (e) {
    console.error('Failed to load .env.local:', e);
}

async function debugReports() {
    const supabase = createAdminClient();

    // 1. Check all reports
    const { data: allReports, error: e1 } = await supabase
        .from('reports')
        .select('id, test_run_id, executive_summary');

    console.log('Total reports in DB:', allReports?.length || 0);
    if (allReports && allReports.length > 0) {
        console.log('First report test_run_id:', (allReports[0] as any).test_run_id);
    }

    // 2. Check the specific test run
    const testRunId = 'a3281c5a-f984-4182-b1c5-79e151b57a56';
    const { data: specificRun, error: e2 } = await supabase
        .from('test_runs')
        .select('*, projects(user_id)')
        .eq('id', testRunId)
        .single();

    console.log('Test Run exists:', !!specificRun);
    if (specificRun) {
        console.log('Project User ID:', (specificRun as any).projects?.user_id);
    }

    // 3. Check report for this run
    const { data: specificReport, error: e3 } = await supabase
        .from('reports')
        .select('*')
        .eq('test_run_id', testRunId)
        .maybeSingle();

    console.log('Report for run exists:', !!specificReport);
}

debugReports();
