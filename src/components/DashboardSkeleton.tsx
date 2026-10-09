// Shown while the dashboard code downloads, so the screen is never blank.
export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background flex" aria-busy="true" aria-label="Loading dashboard">
      <aside className="hidden lg:flex w-72 shrink-0 flex-col gap-3 p-5 border-r border-surface-container-high">
        <div className="h-10 w-40 rounded-lg bg-surface-container animate-pulse" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 rounded-lg bg-surface-container-low animate-pulse" />
        ))}
      </aside>

      <div className="flex-1 min-w-0">
        <div className="h-16 border-b border-surface-container-high bg-surface-container-low animate-pulse" />
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="h-7 w-48 rounded-lg bg-surface-container animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-surface-container-low border border-surface-container-high animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-surface-container-low border border-surface-container-high animate-pulse" />
        </div>
      </div>
    </div>
  );
}
