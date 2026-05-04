import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const { sessionId } = await params;
    const adminSupabase = createAdminClient();

    const { error } = await (adminSupabase.from('persona_sessions') as any)
        .update({
            step_requested: true,
            is_paused: false
        })
        .eq('id', sessionId);

    if (error) {
        console.error('Error signaling next step:', error);
        return NextResponse.json({ error: 'Failed to signal next step' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
