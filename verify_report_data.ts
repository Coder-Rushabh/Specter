import { createAdminClient } from './src/lib/supabase/admin';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyReport(testRunId: string) {
    console.log(`Checking report for test run: ${testRunId}`);

    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from('reports')
        .select('id, test_run_id, executive_summary, report_data')
        .eq('test_run_id', testRunId)
        .single();

    if (error) {
        console.error('Error fetching report:', error);
        return;
    }

    if (!data) {
        console.log('No report found for this test run');
        return;
    }

    console.log('Report found!');
    console.log('ID:', data.id);
    console.log('Executive Summary length:', data.executive_summary?.length || 0);
    if (data.executive_summary) {
        console.log('Executive Summary snippet:', data.executive_summary.substring(0, 500));
    } else {
        console.log('Executive Summary is NULL or EMPTY');
    }

    console.log('Report Data Keys:', Object.keys(data.report_data || {}));
}

const testRunId = 'a3281c5a-f984-4182-b1c5-79e151b57a56';
verifyReport(testRunId);
