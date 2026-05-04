'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { generateAndStoreReport } from '@/lib/engine/reporter';
import { revalidatePath } from 'next/cache';

/**
 * Manually triggers a report refresh for a specific test run.
 * Useful if the automatic generation failed or the user wants the latest stats mid-run.
 */
export async function triggerReportRefresh(testRunId: string, force = false) {
    try {
        console.log(`Manual refresh requested for test run: ${testRunId} (force=${force})`);

        // 1. Trigger the background reporter
        // Note: We don't await this if we want immediate UI return, 
        // but for a "refresh" button, awaiting ensures the data is there when page reloads.
        await generateAndStoreReport(testRunId, force);

        // 2. Clear cache for the report page
        revalidatePath(`/reports/${testRunId}`);

        return { success: true };
    } catch (error: any) {
        console.error('Failed to refresh report:', error);
        return { success: false, error: error.message };
    }
}
