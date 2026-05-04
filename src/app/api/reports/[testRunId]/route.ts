import { createAdminClient } from '@/lib/supabase/admin';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ testRunId: string }> }
) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { testRunId } = await params;
    const supabase = createAdminClient();

    // Verify ownership before deleting
    type TestRunRow = { id: string; project: { user_id: string } | { user_id: string }[] };
    const result = await (supabase
        .from('test_runs')
        .select('id, project:projects!inner(user_id)')
        .eq('id', testRunId)
        .single() as unknown as Promise<{ data: TestRunRow | null }>);
    const testRun = result.data;

    const project = Array.isArray(testRun?.project) ? testRun.project[0] : testRun?.project;
    if (!testRun || project?.user_id !== userId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { error } = await supabase.from('test_runs').delete().eq('id', testRunId);
    if (error) {
        console.error('Error deleting test run:', error);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
