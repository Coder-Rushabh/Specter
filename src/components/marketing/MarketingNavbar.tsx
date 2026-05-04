'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Ghost, Menu, X } from 'lucide-react';
import { SignInButton, UserButton, useAuth } from '@clerk/nextjs';

const NAV_LINKS = [
  { name: 'Home', href: '/' },
  { name: 'Product', href: '/product' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Docs', href: '/docs' },
  { name: 'About', href: '/about' },
];

export default function MarketingNavbar() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const transparent = isHome && !scrolled && !menuOpen;

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: transparent ? 'transparent' : 'rgba(6,6,16,0.92)',
          backdropFilter: transparent ? 'none' : 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: transparent ? 'none' : 'blur(20px) saturate(180%)',
          borderBottom: transparent
            ? '1px solid transparent'
            : '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="mx-auto max-w-6xl px-6">
          <nav className="flex h-[60px] items-center justify-between gap-4">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
              <div className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                transparent
                  ? 'bg-slate-900/10 text-slate-700 group-hover:bg-indigo-600 group-hover:text-white'
                  : 'bg-white/12 text-white group-hover:bg-indigo-600'
              }`}>
                <Ghost className="h-3.5 w-3.5 fill-current" />
              </div>
              <span className={`text-sm font-semibold tracking-tight transition-colors ${
                transparent ? 'text-slate-800' : 'text-white'
              }`}>
                Specter
              </span>
            </Link>

            {/* Desktop center links */}
            <div className="hidden md:flex items-center gap-2 flex-1 justify-center">
              {NAV_LINKS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`relative px-3.5 py-1.5 text-sm rounded-lg transition-all ${
                      isActive
                        ? transparent ? 'text-slate-900 font-bold' : 'text-white font-bold'
                        : transparent
                          ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-900/5'
                          : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {item.name}
                    <span className={`absolute bottom-0 left-3.5 right-3.5 h-[2.5px] rounded-t-full transition-all duration-300 ${
                      isActive
                        ? transparent ? 'bg-indigo-600 scale-100 opacity-100' : 'bg-indigo-400 scale-100 opacity-100'
                        : 'bg-transparent scale-0 opacity-0'
                    }`} />
                  </Link>
                );
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Desktop auth */}
              <div className="hidden md:flex items-center gap-2">
                {!isSignedIn ? (
                  <SignInButton mode="modal">
                    <button className="px-5 py-2 text-sm font-semibold rounded-xl bg-white text-slate-900 shadow-[0_2px_10px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 active:scale-95 transition-all border border-slate-200/60">
                      Log in
                    </button>
                  </SignInButton>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="px-3.5 py-1.5 text-sm font-medium rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all">
                      Dashboard
                    </Link>
                    <UserButton appearance={{ elements: { userButtonAvatarBox: 'h-7 w-7 rounded-md' } }} />
                  </div>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg transition-colors text-white/80 hover:text-white hover:bg-white/10"
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile dropdown */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            menuOpen ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0'
          }`}
          style={{ borderTop: menuOpen ? '1px solid rgba(255,255,255,0.07)' : 'none' }}
        >
          <div className="px-6 py-4 space-y-1">
            {NAV_LINKS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-500/15 text-white border border-indigo-500/25'
                      : 'text-white/65 hover:text-white hover:bg-white/8'
                  }`}
                >
                  {item.name}
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />}
                </Link>
              );
            })}

            {/* Mobile auth */}
            <div className="pt-3 border-t border-white/8">
              {!isSignedIn ? (
                <SignInButton mode="modal">
                  <button className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-white text-slate-900 transition-all active:scale-95">
                    Log in
                  </button>
                </SignInButton>
              ) : (
                <div className="flex items-center justify-between px-4 py-2">
                  <Link href="/dashboard" className="text-sm text-white/70 hover:text-white transition-colors">
                    Dashboard
                  </Link>
                  <UserButton appearance={{ elements: { userButtonAvatarBox: 'h-8 w-8 rounded-md' } }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
