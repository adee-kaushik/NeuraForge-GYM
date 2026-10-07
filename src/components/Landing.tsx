import Link from 'next/link';

const WHATSAPP = '919351219914';
const DEMO_LINK = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hi, I want a demo of NeuraForge Gym OS for my gym.')}`;

const problems = [
  { icon: 'event_busy', title: 'Renewals slip through', text: 'Expiry dates sit in a register or an Excel sheet. By the time someone calls, the member has already stopped coming.' },
  { icon: 'payments', title: 'Pending fees get forgotten', text: 'Who paid, who owes and how much is scattered across notebooks and chats.' },
  { icon: 'help', title: 'You cannot tell who really comes', text: 'Without attendance you cannot tell your active members from the ones who have quietly left.' },
];

const features = [
  { icon: 'groups', title: 'Members and plans', text: 'Add members and set your own plans and prices.' },
  { icon: 'chat', title: 'Renewal reminders', text: 'See who expires this week and send a WhatsApp reminder in one tap.' },
  { icon: 'receipt_long', title: 'Payments', text: 'Record cash, UPI or card. Track pending dues. Every payment gets a GST invoice number.' },
  { icon: 'how_to_reg', title: 'Attendance', text: 'Mark check-ins in seconds. Expired memberships are caught at the door.' },
  { icon: 'upload_file', title: 'Import your members', text: 'Bring your existing members in from Excel. No retyping.' },
  { icon: 'badge', title: 'Owner and staff logins', text: 'Your front desk gets their own login. Only you change settings and plans.' },
];

const steps = [
  { title: 'Book a demo', text: 'Message us on WhatsApp and we show you the app.' },
  { title: 'Add your members', text: 'Import them from Excel or add them one by one.' },
  { title: 'Open it every morning', text: 'See who needs a renewal call and who owes money.' },
];

const demoButton =
  'inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container text-base font-bold shadow-[0_0_24px_rgba(148,125,255,0.35)] transition-colors';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <span className="font-sora text-lg font-bold">NeuraForge <span className="text-secondary">Gym OS</span></span>
        <nav className="flex items-center gap-5 text-sm font-semibold">
          <Link href="/login" className="text-on-surface-variant hover:text-on-surface">Owner login</Link>
          <Link href="/member/login" className="hidden sm:block text-on-surface-variant hover:text-on-surface">Member login</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <p className="text-xs font-bold uppercase tracking-wider text-secondary">Gym management for Indian gyms</p>
          <h1 className="mt-4 max-w-3xl font-sora text-4xl font-bold leading-tight sm:text-6xl">
            Stop losing members to forgotten renewals.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-on-surface-variant">
            Every member, plan, payment and visit in one place, and a clear list of who needs a renewal call today.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a href={DEMO_LINK} className={demoButton}>Book a free demo</a>
            <a href="#features" className="inline-flex items-center justify-center px-6 py-3.5 rounded-lg border border-surface-container-high text-base font-bold text-on-surface hover:bg-surface-container-low transition-colors">
              See what it does
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-20 sm:pb-28">
          <h2 className="font-sora text-2xl font-bold sm:text-3xl">Sound familiar?</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {problems.map((p) => (
              <div key={p.title} className="rounded-2xl border border-surface-container-high bg-surface-container-low p-6">
                <span className="material-symbols-outlined text-3xl text-error">{p.icon}</span>
                <h3 className="mt-4 font-sora text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-on-surface-variant">{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-5xl px-5 pb-20 sm:pb-28">
          <h2 className="font-sora text-2xl font-bold sm:text-3xl">Everything your gym needs every day</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-secondary/30 bg-surface-container-low p-6 shadow-[0_0_24px_rgba(123,208,255,0.06)]">
                <span className="material-symbols-outlined text-3xl text-secondary">{f.icon}</span>
                <h3 className="mt-4 font-sora text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-on-surface-variant">{f.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-primary/30 bg-surface-container-low p-6 sm:p-8">
            <h3 className="font-sora text-lg font-semibold">A member app too</h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Your members log in on their phone to see their plan, expiry date, visits and payments. No more asking the front desk.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-20 sm:pb-28">
          <h2 className="font-sora text-2xl font-bold sm:text-3xl">Start in three steps</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-surface-container-high p-6">
                <span className="font-sora text-sm font-bold text-secondary">0{i + 1}</span>
                <h3 className="mt-3 font-sora text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-on-surface-variant">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-24">
          <div className="rounded-3xl border border-primary/30 bg-surface-container-low px-6 py-14 text-center shadow-[0_0_40px_rgba(148,125,255,0.12)] sm:px-12">
            <h2 className="font-sora text-2xl font-bold sm:text-4xl">See it with your own members</h2>
            <p className="mx-auto mt-4 max-w-xl text-on-surface-variant">Message us on WhatsApp and we will show you how it works for your gym.</p>
            <a href={DEMO_LINK} className={`${demoButton} mt-8`}>Book a free demo</a>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-5xl flex-col gap-3 border-t border-surface-container-high px-5 py-8 text-sm text-outline sm:flex-row sm:items-center sm:justify-between">
        <span>© NeuraForge</span>
        <div className="flex gap-5">
          <Link href="/login" className="hover:text-on-surface">Owner login</Link>
          <Link href="/member/login" className="hover:text-on-surface">Member login</Link>
        </div>
      </footer>
    </div>
  );
}
