export default function DashboardLoading() {
    return (
        <div className="flex min-h-[60vh] w-full flex-col items-center justify-center space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce" />
            </div>
            <p className="text-sm text-slate-400">Loading...</p>
        </div>
    );
}
