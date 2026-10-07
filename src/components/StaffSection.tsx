import React, { useEffect, useState } from 'react';
import { addStaff, listStaff, removeStaff, resetStaffPassword } from '@/actions/staff';
import type { StaffRecord } from '../types';

const inputClass =
  'w-full bg-surface-container-lowest border border-surface-container-high focus:border-secondary rounded-lg p-2.5 text-on-surface focus:outline-none';
const labelClass = 'block text-xs font-bold uppercase text-outline mb-1';

interface Credentials {
  name: string;
  email: string;
  phone: string | null;
  password: string;
}

// Owner only: see the gym's logins, add staff, reset a password, remove access
export const StaffSection: React.FC = () => {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [creds, setCreds] = useState<Credentials | null>(null);

  useEffect(() => {
    listStaff().then((res) => {
      if ('error' in res) setError(res.error);
      else setStaff(res.staff);
      setLoading(false);
    });
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await addStaff({ name, email, phone });
    setBusy(false);
    if ('error' in res) return setError(res.error);
    setStaff((prev) => [...prev, res.staff]);
    setCreds({ name: res.staff.name, email: res.staff.email, phone: res.staff.phone, password: res.password });
    setName('');
    setEmail('');
    setPhone('');
    setAdding(false);
  };

  const handleReset = async (s: StaffRecord) => {
    setError('');
    const res = await resetStaffPassword(s.id);
    if ('error' in res) return setError(res.error);
    setCreds({ name: s.name, email: s.email, phone: s.phone, password: res.password });
  };

  const handleRemove = async (s: StaffRecord) => {
    if (!window.confirm(`Remove ${s.name}? They will lose access straight away.`)) return;
    setError('');
    const res = await removeStaff(s.id);
    if ('error' in res) return setError(res.error);
    setStaff((prev) => prev.filter((x) => x.id !== s.id));
    if (creds?.email === s.email) setCreds(null);
  };

  const sendOnWhatsApp = (c: Credentials) => {
    const text = `Hi ${c.name}, your gym dashboard login:\nEmail: ${c.email}\nPassword: ${c.password}\nLogin: ${window.location.origin}/login`;
    window.open(`https://api.whatsapp.com/send?phone=${encodeURIComponent((c.phone ?? '').replace(/\D/g, ''))}&text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <section className="max-w-2xl p-5 rounded-xl bg-surface-container-low border border-surface-container-high space-y-5 text-xs text-on-surface">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-surface-container-high">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">badge</span>
          <h3 className="font-sora text-sm font-semibold text-on-surface">Staff</h3>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="px-3.5 py-1.5 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container text-xs font-bold cursor-pointer">
            + Add staff
          </button>
        )}
      </div>

      <p className="text-outline">
        Staff can add members, record payments and mark attendance. Only you can change settings, plans and imports.
      </p>

      {adding && (
        <form onSubmit={handleAdd} className="space-y-4 p-4 rounded-lg border border-surface-container-high">
          <div>
            <label className={labelClass} htmlFor="staff-name">Name</label>
            <input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="staff-email">Email (they log in with this)</label>
            <input id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoCapitalize="none" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="staff-phone">Phone (optional, to send the login on WhatsApp)</label>
            <input id="staff-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setAdding(false)} className="px-4 py-2 rounded-lg text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="px-5 py-2 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container text-xs font-bold disabled:opacity-60 cursor-pointer">
              {busy ? 'Adding...' : 'Add staff'}
            </button>
          </div>
        </form>
      )}

      {creds && (
        <div className="rounded-lg border border-secondary/30 bg-secondary/10 p-4 space-y-1.5">
          <p className="text-on-surface font-semibold">Login for {creds.name}</p>
          <p>Email: <b>{creds.email}</b></p>
          <p>Password: <b className="font-mono">{creds.password}</b></p>
          <p className="text-outline">Shown only once. Send it to them now.</p>
          {creds.phone && (
            <button onClick={() => sendOnWhatsApp(creds)} className="font-bold text-tertiary hover:underline cursor-pointer">
              Send on WhatsApp
            </button>
          )}
        </div>
      )}

      {error && <p className="text-error font-semibold">{error}</p>}

      <div className="divide-y divide-surface-container-high">
        {loading ? (
          <p className="py-3 text-outline">Loading...</p>
        ) : (
          staff.map((s) => (
            <div key={s.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-on-surface text-sm">
                  {s.name}{' '}
                  <span className="ml-1 px-2 py-0.5 rounded-full border border-surface-container-high text-xs text-outline">
                    {s.role === 'OWNER' ? 'Owner' : 'Staff'}
                  </span>
                </p>
                <p className="text-outline truncate">{s.email}</p>
              </div>
              {s.role === 'STAFF' && (
                <div className="flex items-center gap-4">
                  <button onClick={() => handleReset(s)} className="font-bold text-secondary hover:underline cursor-pointer">
                    Reset password
                  </button>
                  <button onClick={() => handleRemove(s)} className="font-bold text-error hover:underline cursor-pointer">
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
};
