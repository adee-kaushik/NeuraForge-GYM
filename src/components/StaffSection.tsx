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
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creds, setCreds] = useState<Credentials | null>(null);

  useEffect(() => {
    listStaff().then((res) => {
      if ('error' in res) setError(res.error);
      else setStaff(res.staff);
      setLoading(false);
    });
  }, []);

  const handleGeneratePassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const generated = `Staff#${rand}`;
    setPassword(generated);
    setShowPassword(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await addStaff({ name, email, phone, password: password || undefined });
    setBusy(false);
    if ('error' in res) return setError(res.error);
    setStaff((prev) => [...prev, res.staff]);
    setCreds({ name: res.staff.name, email: res.staff.email, phone: res.staff.phone, password: res.password });
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
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

  const [copiedUrl, setCopiedUrl] = useState(false);

  const sendOnWhatsApp = (c: Credentials) => {
    const staffLoginUrl = `${window.location.origin}/staff/login`;
    const text = `Hi ${c.name}, here are your credentials for the Gym Staff Panel:\n\nEmail: ${c.email}\nPassword: ${c.password}\nStaff Login Portal: ${staffLoginUrl}\n\nYou can access member registrations, plans, supplement POS, workout routines, and floor velocity.`;
    window.open(`https://api.whatsapp.com/send?phone=${encodeURIComponent((c.phone ?? '').replace(/\D/g, ''))}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyStaffUrl = () => {
    const url = `${window.location.origin}/staff/login`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  return (
    <section className="max-w-2xl p-5 rounded-xl bg-surface-container-low border border-surface-container-high space-y-5 text-xs text-on-surface">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-surface-container-high">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">badge</span>
          <h3 className="font-sora text-sm font-semibold text-on-surface">Staff &amp; Trainers Management</h3>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="px-3.5 py-1.5 rounded-lg bg-primary-container hover:bg-[#cabeff] text-on-primary-container text-xs font-bold cursor-pointer">
            + Add staff
          </button>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-outline">
          Register gym staff and trainers here. Staff members log in via the dedicated <b>Staff Panel</b> with access strictly limited to: <b>Add Members</b>, <b>Memberships &amp; Plans</b>, <b>Supplements for selling (POS)</b>, <b>Workout Plans (editable)</b>, and <b>Floor Velocity</b>.
        </p>
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-high text-[11px]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-secondary">link</span>
            <span className="text-outline font-mono">Staff Login Portal:</span>
            <span className="font-bold text-secondary font-mono">/staff/login</span>
          </div>
          <button
            type="button"
            onClick={handleCopyStaffUrl}
            className="text-xs font-bold text-secondary hover:underline cursor-pointer"
          >
            {copiedUrl ? 'Copied Link!' : 'Copy Portal URL'}
          </button>
        </div>
      </div>

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
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelClass} htmlFor="staff-password">Login Password</label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-xs font-bold text-secondary hover:underline cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">key</span>
                <span>Create / Generate Password</span>
              </button>
            </div>
            <div className="relative">
              <input
                id="staff-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Type custom password or tap 'Create Password'"
                className={`${inputClass} pr-20`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] text-outline hover:text-on-surface font-semibold"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-[11px] text-outline mt-1">
              Leave blank to auto-generate a secure password, or tap <b>Create / Generate Password</b>.
            </p>
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
        <div className="rounded-lg border border-secondary/30 bg-secondary/10 p-4 space-y-2">
          <p className="text-on-surface font-semibold">Login for {creds.name} (Staff Member)</p>
          <p>Email: <b>{creds.email}</b></p>
          <p>Password: <b className="font-mono">{creds.password}</b></p>
          <p>Portal URL: <b className="font-mono">{typeof window !== 'undefined' ? `${window.location.origin}/staff/login` : '/staff/login'}</b></p>
          <p className="text-outline">Shown only once. Send it to them now.</p>
          <div className="flex gap-4 pt-1">
            {creds.phone && (
              <button onClick={() => sendOnWhatsApp(creds)} className="font-bold text-tertiary hover:underline cursor-pointer">
                Send on WhatsApp
              </button>
            )}
            <button onClick={handleCopyStaffUrl} className="font-bold text-secondary hover:underline cursor-pointer">
              {copiedUrl ? 'Copied Staff URL!' : 'Copy Staff Login URL'}
            </button>
          </div>
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
