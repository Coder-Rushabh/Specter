'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
    { name: 'Home', href: '/' },
    { name: 'Product', href: '/product' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Docs', href: '/docs' },
    { name: 'About', href: '/about' },
];

export default function NavLinks() {
    const pathname = usePathname();

    return (
        <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {links.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={`relative px-3.5 py-1.5 text-sm rounded-lg transition-all ${
                            isActive
                                ? 'text-slate-900 font-medium'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        {item.name}
                        {isActive && (
                            <span className="absolute bottom-0 left-3.5 right-3.5 h-0.5 rounded-full bg-indigo-600" />
                        )}
                    </Link>
                );
            })}
        </div>
    );
}
