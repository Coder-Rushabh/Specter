import Link from 'next/link';
import { Ghost } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col font-sans">

            {/* ── NAVBAR — transparent on homepage, glassmorphism after scroll ── */}
            <MarketingNavbar />

            <main className="flex-1">{children}</main>

            {/* ── FOOTER ── */}
            <footer className="bg-slate-950 border-t border-white/5">
                <div className="mx-auto max-w-5xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-white group-hover:bg-indigo-600 transition-colors">
                            <Ghost className="h-3 w-3 fill-current" />
                        </div>
                        <span className="text-sm font-bold text-white tracking-tight">Specter</span>
                    </Link>

                    <nav className="flex items-center flex-wrap justify-center gap-x-6 gap-y-2">
                        {[
                            { label: 'Home', href: '/' },
                            { label: 'Product', href: '/product' },
                            { label: 'Pricing', href: '/pricing' },
                            { label: 'Docs', href: '/docs' },
                            { label: 'About', href: '/about' },
                            { label: 'Dashboard', href: '/dashboard' },
                        ].map(({ label, href }) => (
                            <Link key={label} href={href} className="text-sm text-slate-500 hover:text-white transition-colors">
                                {label}
                            </Link>
                        ))}
                    </nav>

                    <p className="text-xs text-slate-600">© 2026 Specter AI</p>
                </div>
            </footer>
        </div>
    );
}
