export default function MemberLoading() {
  return (
    <main className="min-h-screen bg-background text-on-surface px-5 py-10" aria-busy="true" aria-label="Loading member pass">
      <div className="mx-auto w-full max-w-md space-y-8 animate-pulse">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-4 w-28 rounded bg-surface-container" />
            <div className="h-8 w-44 rounded bg-surface-container" />
            <div className="h-4 w-20 rounded bg-surface-container" />
          </div>
          <div className="h-6 w-16 rounded bg-surface-container" />
        </header>

        <div className="h-64 rounded-2xl bg-surface-container-low border border-surface-container-high" />

        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-xl bg-surface-container-low border border-surface-container-high" />
          <div className="h-24 rounded-xl bg-surface-container-low border border-surface-container-high" />
        </div>

        <div className="h-40 rounded-xl bg-surface-container-low border border-surface-container-high" />
      </div>
    </main>
  );
}
