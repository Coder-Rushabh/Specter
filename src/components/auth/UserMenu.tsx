'use client';

import { UserButton } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export default function UserMenu() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="h-8 w-8 rounded-full bg-white/5 animate-pulse" />;
    }

    return <UserButton />;
}
