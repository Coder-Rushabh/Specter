'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function syncUser() {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await currentUser();
    if (!user) return null;

    const supabase = createAdminClient();

    // Check if user exists in Supabase
    const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching user:', fetchError);
        return null;
    }

    if (!existingUser) {
        // Create user in Supabase
        const { data: newUser, error: insertError } = await (supabase
            .from('users') as any)
            .insert({
                id: userId,
                email: user.emailAddresses[0].emailAddress,
                name: `${user.firstName} ${user.lastName}`.trim(),
                plan_tier: 'pro' // Defaulting to Pro as requested
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error syncing user to Supabase:', insertError);
            return null;
        }
        return newUser;
    }

    return existingUser;
}
