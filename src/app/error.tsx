'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-background text-on-surface">
    <h1 className="text-2xl font-bold">We could not load your data</h1>
    <p role="alert">Your data has not been changed. Please retry in a moment.</p>
    <button onClick={reset} className="rounded-xl px-6 py-3 bg-primary text-on-primary">Try again</button>
    <a href="/login">Return to login</a>
  </main>;
}
