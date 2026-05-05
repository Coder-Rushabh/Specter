import Sidebar from '@/components/dashboard/Sidebar';
import UserMenu from '@/components/auth/UserMenu';
import SyncUser from '@/components/auth/SyncUser';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50 relative">
        <SyncUser />

        {/* ── HEADER ── */}
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between px-8 bg-white border-b border-slate-200">
          <div className="flex items-center gap-4" />
          <UserMenu />
        </header>

        <div className="mx-auto max-w-[1400px] p-6 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
