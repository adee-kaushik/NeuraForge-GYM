/**
 * NeuraFitness - Local Biometric Sync Bridge
 *
 * For machines that only work on the gym's local network (ZKTeco, eSSL, Realtime and similar, port 4370),
 * or any gym that cannot use the machine's own "cloud server" setting.
 * Run it on a PC at the gym that stays switched on. It:
 *   - sends each punch to your NeuraFitness account as it happens,
 *   - every few minutes also reads the machine's stored punches and sends anything it missed
 *     (PC off, internet down, script restarted), so nothing is lost,
 *   - keeps unsent punches in a small file and retries until they get through.
 * Sending the same punch twice is safe: the server ignores repeats.
 *
 * Setup (once):
 *   1. Install Node.js 18 or newer.
 *   2. In this folder run:   npm install node-zklib
 *   3. In NeuraFitness open Members > Biometrics Hub and generate the gym API key.
 *
 * Run:
 *   NEURAFITNESS_URL=https://your-site.com GYM_SLUG=your-gym-code DEVICE_IP=192.168.1.201 \
 *   BIOMETRIC_API_KEY=nfk_... node neurafitness-sync.js
 *   (on Windows PowerShell set each variable first:  $env:GYM_SLUG="your-gym-code" )
 *
 * Optional: DEVICE_PORT (4370), POLL_MINUTES (5), STATE_FILE (./neurafitness-sync-state.json)
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  CLOUD_URL: (process.env.NEURAFITNESS_URL || '').replace(/\/+$/, ''),
  GYM_SLUG: process.env.GYM_SLUG || '',
  API_KEY: process.env.BIOMETRIC_API_KEY || '',
  DEVICE_IP: process.env.DEVICE_IP || '192.168.1.201',
  DEVICE_PORT: parseInt(process.env.DEVICE_PORT || '4370', 10),
  POLL_MS: Math.max(1, parseInt(process.env.POLL_MINUTES || '5', 10)) * 60000,
  STATE_FILE: process.env.STATE_FILE || path.join(process.cwd(), 'neurafitness-sync-state.json'),
  BATCH: 200,
  FIRST_RUN_DAYS: 7,
};

const log = (msg) => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);

// ---- small persistent state: unsent punches + how far we have read ----
let state = { lastSyncedMs: 0, pending: [] };
try {
  state = { ...state, ...JSON.parse(fs.readFileSync(CONFIG.STATE_FILE, 'utf8')) };
} catch (_) {
  /* first run */
}
const saveState = () => {
  try {
    fs.writeFileSync(CONFIG.STATE_FILE, JSON.stringify(state));
  } catch (err) {
    log(`Could not save state file: ${err.message}`);
  }
};

// The machine's clock is local wall time. Send it as plain "YYYY-MM-DD HH:mm:ss" with no timezone:
// NeuraFitness reads that as IST, so this PC's own timezone setting cannot shift attendance.
const pad = (n) => String(n).padStart(2, '0');
const wallClock = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const seen = new Set(state.pending.map((p) => `${p.identifier}|${p.timestamp}`));
function enqueue(identifier, when) {
  const d = when instanceof Date ? when : new Date(when);
  if (!identifier || isNaN(d.getTime())) return;
  const punch = { identifier: String(identifier).trim(), timestamp: wallClock(d) };
  const key = `${punch.identifier}|${punch.timestamp}`;
  if (seen.has(key)) return;
  seen.add(key);
  state.pending.push(punch);
}

let flushing = false;
let fatal = false;
async function flush() {
  if (flushing || fatal) return;
  flushing = true;
  try {
    while (state.pending.length > 0) {
      const batch = state.pending.slice(0, CONFIG.BATCH);
      let res;
      try {
        res = await fetch(`${CONFIG.CLOUD_URL}/api/attendance/biometric`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': CONFIG.API_KEY },
          body: JSON.stringify({ gymSlug: CONFIG.GYM_SLUG, punches: batch }),
        });
      } catch (err) {
        log(`Cannot reach ${CONFIG.CLOUD_URL} (${err.message}). ${state.pending.length} punch(es) kept, will retry.`);
        break;
      }

      if (res.status === 401) {
        fatal = true;
        log('REJECTED: wrong gym code or API key. Generate a key in Members > Biometrics Hub and check GYM_SLUG. Stopping.');
        break;
      }
      if (!res.ok) {
        log(`Server answered ${res.status}. ${state.pending.length} punch(es) kept, will retry.`);
        break;
      }

      const data = await res.json().catch(() => ({}));
      state.pending.splice(0, batch.length);
      batch.forEach((p) => seen.delete(`${p.identifier}|${p.timestamp}`));
      log(`Sent ${batch.length} punch(es): ${JSON.stringify(data.counts || {})}`);
    }
  } finally {
    saveState();
    flushing = false;
  }
}

let flushTimer = null;
const flushSoon = () => {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, 500);
};

// Read what the machine has stored and queue anything newer than the last sync (the server ignores repeats).
async function catchUp(zk) {
  const logs = await zk.getAttendances();
  const rows = (logs && logs.data) || [];
  const since = state.lastSyncedMs
    ? state.lastSyncedMs - 10 * 60000
    : Date.now() - CONFIG.FIRST_RUN_DAYS * 86400000;
  let newest = state.lastSyncedMs;
  let queued = 0;
  for (const r of rows) {
    const t = new Date(r.recordTime).getTime();
    if (isNaN(t) || t < since) continue;
    enqueue(r.deviceUserId, new Date(t));
    queued += 1;
    if (t > newest) newest = t;
  }
  state.lastSyncedMs = newest || state.lastSyncedMs;
  if (queued) log(`Caught up ${queued} stored punch(es) from the machine.`);
  saveState();
  await flush();
}

async function startBridge() {
  if (!CONFIG.CLOUD_URL || !CONFIG.GYM_SLUG || !CONFIG.API_KEY) {
    console.error('Missing settings. Set NEURAFITNESS_URL, GYM_SLUG and BIOMETRIC_API_KEY (see the top of this file).');
    process.exit(1);
  }

  const ZKLib = require('node-zklib');
  console.log('====================================================');
  console.log('  NeuraFitness - Biometric LAN Bridge');
  console.log('====================================================');
  log(`Machine ${CONFIG.DEVICE_IP}:${CONFIG.DEVICE_PORT}  ->  ${CONFIG.CLOUD_URL}  (gym ${CONFIG.GYM_SLUG})`);

  let pollTimer = null;
  const retry = (why) => {
    clearInterval(pollTimer);
    log(`${why} Retrying in 10 seconds...`);
    setTimeout(startBridge, 10000);
  };

  const zk = new ZKLib(CONFIG.DEVICE_IP, CONFIG.DEVICE_PORT, 10000, 4000);
  try {
    await zk.createSocket();
    log('Connected to the machine.');

    await flush(); // anything left from a previous run
    await catchUp(zk);

    zk.getRealTimeLogs((data) => {
      log(`Live punch: ID ${data.userId}`);
      enqueue(data.userId, data.attTime);
      flushSoon();
    });

    pollTimer = setInterval(() => {
      catchUp(zk).catch((err) => retry(`Lost the machine (${err.message}).`));
    }, CONFIG.POLL_MS);

    log('Ready. Listening for fingerprint and face punches.');
  } catch (err) {
    retry(`Could not use the machine at ${CONFIG.DEVICE_IP} (${err && err.message ? err.message : err}).`);
  }
}

startBridge();
