'use client';

import { useEffect } from 'react';
import { syncUser } from '@/app/actions/user';
import { useUser } from '@clerk/nextjs';

export default function SyncUser() {
    const { isLoaded, isSignedIn } = useUser();

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            syncUser();
        }
    }, [isLoaded, isSignedIn]);

    return null;
}
