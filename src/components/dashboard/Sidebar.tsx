'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Ghost, LayoutDashboard, Zap,
  Users, BarChart3
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Test Runs', icon: Zap, href: '/test-runs' },
    { name: 'AI Users', icon: Users, href: '/personas' },
    { name: 'Reports', icon: BarChart3, href: '/reports' },
  ];

  return (
    <div className="hidden md:flex h-screen w-64 flex-col border-r border-slate-200 bg-white text-slate-600 relative z-[60]">
      {/* ── LOGO ── */}
      <Link href="/" className="flex h-16 items-center gap-3 px-6 border-b border-slate-100 cursor-pointer group/logo">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white transition-transform group-hover/logo:scale-105">
          <Ghost className="h-4 w-4 fill-current" />
        </div>
        <span className="text-base font-bold tracking-tight text-slate-900">Specter</span>
      </Link>

      {/* ── NAVIGATION ── */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <item.icon
                  className={`h-4 w-4 flex-shrink-0 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                />
                {item.name}
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-500" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
