'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  getBiometricOverview,
  registerDevice,
  removeDevice,
  rotateBiometricKey,
  setAttendanceMode,
  type BiometricOverview,
} from '@/actions/biometric';

type Overview = Extract<BiometricOverview, { ok: true }>;

const RESULT_LABEL: Record<string, { text: string; className: string }> = {
  GRANTED: { text: 'Checked in', className: 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40' },
  ALREADY_IN: { text: 'Already in today', className: 'bg-surface-container-high text-outline border-surface-container-high' },
  EXPIRED: { text: 'Expired · not counted', className: 'bg-error/15 text-error border-error/40' },
  UNKNOWN_ID: { text: 'Unknown ID', className: 'bg-amber-500/15 text-amber-400 border-amber-500/40' },
  BAD_TIME: { text: 'Machine clock wrong', className: 'bg-amber-500/15 text-amber-400 border-amber-500/40' },
  STALE: { text: 'Too old', className: 'bg-surface-container-high text-outline border-surface-container-high' },
};

const VERIFY_LABEL: Record<string, string> = {
  FINGERPRINT: 'Fingerprint',
  FACE: 'Face',
  CARD: 'Card',
  PASSWORD: 'Password',
  PALM: 'Palm',
  OTHER: 'Other',
};

/** "2 min ago" / "3 h ago" / "12 Oct" for machine and punch times */
function ago(iso: string | null, nowMs: number): string {
  if (!iso) return 'never';
  const diff = Math.max(0, nowMs - new Date(iso).getTime());
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

const timeOf = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

const ONLINE_WINDOW_MS = 5 * 60000;

export const BiometricDevicesPanel: React.FC = () => {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [serial, setSerial] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState('');

  const [newKey, setNewKey] = useState('');
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getBiometricOverview();
      if ('error' in res) {
        setError(res.error);
      } else {
        setData(res);
        setError('');
      }
    } catch {
      setError('Could not load biometric status. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load once, then keep fresh while the hub is open so "Online" and new punches show up without a reload
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const nowMs = data ? new Date(data.serverTime).getTime() : Date.now();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setAdding(true);
    const res = await registerDevice(serial, deviceName);
    setAdding(false);
    if ('error' in res) {
      setFormError(res.error);
      return;
    }
    setSerial('');
    setDeviceName('');
    load();
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}"? It will stop recording attendance until you register it again.`)) return;
    const res = await removeDevice(id);
    if ('error' in res) setFormError(res.error);
    load();
  };

  const handleKey = async () => {
    if (data?.hasKey && !confirm('Generate a new key? The old key stops working immediately, so the LAN bridge or any integration using it must be updated.')) return;
    setKeyBusy(true);
    const res = await rotateBiometricKey();
    setKeyBusy(false);
    if ('error' in res) {
      setFormError(res.error);
      return;
    }
    setNewKey(res.key);
    load();
  };

  const copyKey = () => {
    navigator.clipboard.writeText(newKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const handleMode = async (mode: 'QR' | 'BIOMETRIC') => {
    if (!data || data.attendanceMode === mode) return;
    const res = await setAttendanceMode(mode);
    if ('error' in res) {
      setFormError(res.error);
      return;
    }
    load();
  };

  if (loading) {
    return <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container-high text-xs text-outline">Loading machines…</div>;
  }
  if (error || !data) {
    return (
      <div className="p-4 rounded-xl bg-error/10 border border-error/40 text-xs text-error flex items-center justify-between gap-3">
        <span>{error || 'Could not load biometric status.'}</span>
        <button type="button" onClick={load} className="px-3 py-1 rounded-lg bg-error text-white font-bold cursor-pointer">Retry</button>
      </div>
    );
  }

  const cardClass = 'bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high space-y-3';
  const labelClass = 'text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-1.5';
  const inputClass =
    'w-full bg-surface-container px-3 py-2 rounded-xl text-xs font-mono text-on-surface border border-surface-container-high focus:border-secondary focus:outline-none';

  return (
    <div className="space-y-4">
      {formError && (
        <div className="p-3 rounded-xl bg-error/10 border border-error/40 text-xs text-error flex items-start justify-between gap-3">
          <span>{formError}</span>
          <button type="button" onClick={() => setFormError('')} className="shrink-0 font-bold cursor-pointer">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Machines */}
        <div className={`lg:col-span-7 ${cardClass}`}>
          <div className="flex items-center justify-between">
            <span className={labelClass}>
              <span className="material-symbols-outlined text-sm text-secondary">devices</span>
              <span>Your machines</span>
            </span>
            <button type="button" onClick={load} className="text-[11px] font-bold text-secondary hover:underline cursor-pointer">Refresh</button>
          </div>

          {data.devices.length === 0 ? (
            <p className="text-[11px] text-outline">
              No machine registered yet. Add its serial number below. A machine that is not registered is ignored, so it keeps its punches and sends them once you register it.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.devices.map((d) => {
                const online = d.lastSeenAt && nowMs - new Date(d.lastSeenAt).getTime() < ONLINE_WINDOW_MS;
                return (
                  <li key={d.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface-container border border-surface-container-high">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${online ? 'bg-[#4edea3] animate-pulse' : 'bg-outline'}`} />
                        <span className="text-xs font-bold text-on-surface truncate">{d.name}</span>
                        <span className={`text-[10px] font-bold ${online ? 'text-[#4edea3]' : 'text-outline'}`}>{online ? 'Online' : 'Offline'}</span>
                      </div>
                      <p className="text-[11px] text-outline font-mono mt-0.5">
                        SN {d.serialNumber} · last seen {ago(d.lastSeenAt, nowMs)}
                        {d.lastIp ? ` · ${d.lastIp}` : ''}
                      </p>
                      {!d.lastSeenAt && (
                        <p className="text-[11px] text-amber-400 mt-0.5">Never connected yet. Check the server address on the machine (see Machine Configuration).</p>
                      )}
                    </div>
                    {data.isOwner && (
                      <button type="button" onClick={() => handleRemove(d.id, d.name)} className="text-[11px] font-bold text-error hover:underline cursor-pointer shrink-0">
                        Remove
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {data.isOwner ? (
            <form onSubmit={handleAdd} className="pt-3 border-t border-surface-container-high space-y-2">
              <span className="text-[11px] text-outline block">
                Add a machine. Serial number: Menu → System Info → Device Info, or the sticker on the back.
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                <input
                  value={serial}
                  onChange={(e) => setSerial(e.target.value.toUpperCase())}
                  placeholder="Serial number"
                  aria-label="Machine serial number"
                  className={`${inputClass} sm:col-span-2`}
                />
                <input
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="Name (e.g. Front door)"
                  aria-label="Machine name"
                  className={`${inputClass} sm:col-span-2 font-sans`}
                />
                <button
                  type="submit"
                  disabled={adding || !serial.trim()}
                  className="px-3 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all"
                >
                  {adding ? 'Adding…' : 'Add machine'}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-[11px] text-outline pt-2 border-t border-surface-container-high">Only the gym owner can add or remove machines.</p>
          )}
        </div>

        {/* Mode + key */}
        <div className="lg:col-span-5 space-y-4">
          <div className={cardClass}>
            <span className={labelClass}>
              <span className="material-symbols-outlined text-sm text-secondary">how_to_reg</span>
              <span>How members check in</span>
            </span>
            <div className="grid grid-cols-2 gap-1 bg-surface-container p-0.5 rounded-lg text-[11px] font-bold">
              {([
                ['QR', 'QR / front desk'],
                ['BIOMETRIC', 'Biometric machine'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  disabled={!data.isOwner}
                  onClick={() => handleMode(mode)}
                  className={`px-2 py-1.5 rounded-md transition-all ${data.isOwner ? 'cursor-pointer' : 'cursor-not-allowed'} ${
                    data.attendanceMode === mode ? 'bg-surface-container-lowest text-secondary shadow-xs' : 'text-outline hover:text-on-surface'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-outline">
              {data.attendanceMode === 'BIOMETRIC'
                ? 'Members cannot tap "check in" in their app. Attendance comes from the machine; staff can still check someone in by hand if a machine is down.'
                : 'Members can check in from their pass and staff can check in by code or QR. Machines also record attendance when registered.'}
            </p>
          </div>

          <div className={cardClass}>
            <span className={labelClass}>
              <span className="material-symbols-outlined text-sm text-secondary">key</span>
              <span>Gym API key</span>
            </span>
            <p className="text-[11px] text-outline">
              Required for every device integration. For eSSL / ZKTeco ADMS, use the authenticated LAN relay with this gym API key; a serial number alone cannot authorize uploads.
            </p>
            {newKey ? (
              <div className="space-y-1.5">
                <code className="block p-2 bg-surface-container rounded text-[11px] font-mono text-tertiary break-all border border-surface-container-high select-all">{newKey}</code>
                <p className="text-[11px] text-amber-400">Copy it now. For security it is shown only once and cannot be viewed again.</p>
                <button type="button" onClick={copyKey} className="px-3 py-1 rounded-lg bg-surface-container-high text-secondary text-xs font-bold cursor-pointer hover:bg-surface-container-highest transition-colors">
                  {keyCopied ? 'Copied!' : 'Copy key'}
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-on-surface-variant">{data.hasKey ? 'A key is set. Generate a new one if it was lost.' : 'No key yet. The REST API and LAN bridge are switched off until you generate one.'}</p>
            )}
            {data.isOwner && (
              <button
                type="button"
                onClick={handleKey}
                disabled={keyBusy}
                className="px-3 py-1.5 rounded-lg bg-secondary/15 hover:bg-secondary/25 text-xs font-bold text-secondary cursor-pointer disabled:opacity-50 transition-colors"
              >
                {keyBusy ? 'Working…' : data.hasKey ? 'Generate new key' : 'Generate key'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* What the machines have sent */}
      <div className={cardClass}>
        <div className="flex items-center justify-between">
          <span className={labelClass}>
            <span className="material-symbols-outlined text-sm text-secondary">history</span>
            <span>Recent machine punches</span>
          </span>
          <button type="button" onClick={() => setShowLog(!showLog)} className="text-[11px] font-bold text-secondary hover:underline cursor-pointer">
            {showLog ? 'Hide connection log' : 'Show connection log'}
          </button>
        </div>

        {data.punches.length === 0 ? (
          <p className="text-[11px] text-outline">Nothing yet. Scan a finger or face on a registered machine and it appears here within seconds.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <tbody>
                {data.punches.map((p) => {
                  const r = RESULT_LABEL[p.result] ?? { text: p.result, className: 'bg-surface-container-high text-outline border-surface-container-high' };
                  return (
                    <tr key={p.id} className="border-t border-surface-container-high first:border-t-0">
                      <td className="py-1.5 pr-3 text-outline whitespace-nowrap">{timeOf(p.at)}</td>
                      <td className="py-1.5 pr-3 font-mono text-secondary whitespace-nowrap">ID {p.pin}</td>
                      <td className="py-1.5 pr-3 text-on-surface">{p.memberName ?? <span className="text-outline">Unknown member</span>}</td>
                      <td className="py-1.5 pr-3 text-outline whitespace-nowrap">{p.verifyType ? VERIFY_LABEL[p.verifyType] ?? p.verifyType : p.source === 'API' ? 'REST' : ''}</td>
                      <td className="py-1.5 text-right whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${r.className}`}>{r.text}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[10px] text-outline">
          An expired member can still open a door that does not check with this software. Their punch shows here as "Expired · not counted", so you can follow up at the desk.
        </p>

        {showLog && (
          <div className="pt-3 border-t border-surface-container-high space-y-1">
            <span className="text-[11px] text-outline block">Connection log (what the machines told the server, newest first). Useful when something is not working.</span>
            {data.activity.length === 0 ? (
              <p className="text-[11px] text-outline">No activity yet.</p>
            ) : (
              <ul className="space-y-1">
                {data.activity.map((a) => (
                  <li key={a.id} className="text-[11px] font-mono text-on-surface-variant">
                    <span className="text-outline">{timeOf(a.at)}</span> · <span className="text-secondary">{a.kind}</span>
                    {a.deviceSerial ? <span className="text-outline"> · {a.deviceSerial}</span> : null} · {a.summary}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
