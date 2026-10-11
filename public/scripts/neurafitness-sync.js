/**
 * NeuraFitness OS - Local Biometric Sync Bridge
 *
 * For gyms using ZKTeco, eSSL, Realtime, or Mantra machines connected
 * to the local gym WiFi/LAN router (e.g. 192.168.1.201:4370).
 *
 * How to run:
 * 1. Install dependencies:
 *    npm install node-zklib dotenv
 * 2. Configure:
 *    Set your GYM_SLUG and DEVICE_IP below (or in .env).
 * 3. Run:
 *    node neurafitness-sync.js
 */

const ZKLib = require('node-zklib');

const CONFIG = {
  // Your gym's NeuraFitness URL (or cloud domain)
  CLOUD_URL: process.env.NEURAFITNESS_URL || process.env.NEURAFORGE_URL || 'https://neurafitness.com',
  // Your gym slug (from NeuraFitness Settings)
  GYM_SLUG: process.env.GYM_SLUG || 'iron-pulse',
  // Local IP address of your biometric device on the gym router
  DEVICE_IP: process.env.DEVICE_IP || '192.168.1.201',
  DEVICE_PORT: parseInt(process.env.DEVICE_PORT || '4370', 10),
  // Optional Biometric API Key if configured
  API_KEY: process.env.BIOMETRIC_API_KEY || '',
};

async function postPunchToCloud(memberPin, punchTime) {
  const endpoint = `${CONFIG.CLOUD_URL}/api/attendance/biometric`;
  const payload = {
    gymSlug: CONFIG.GYM_SLUG,
    identifier: String(memberPin).trim(),
    timestamp: punchTime ? new Date(punchTime).toISOString() : new Date().toISOString(),
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CONFIG.API_KEY ? { 'x-api-key': CONFIG.API_KEY } : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (data.ok) {
      console.log(`[SYNC SUCCESS] ${data.memberName || memberPin} (${data.memberCode}) -> ${data.status} | ${data.message}`);
    } else {
      console.warn(`[SYNC REJECTED] ${memberPin} -> ${data.status || 'DENIED'}: ${data.error}`);
    }
  } catch (err) {
    console.error(`[SYNC ERROR] Could not reach cloud server: ${err.message}`);
  }
}

async function startBridge() {
  console.log('====================================================');
  console.log('  NeuraFitness OS - Universal Biometric LAN Bridge  ');
  console.log('====================================================');
  console.log(`Connecting to Biometric Terminal: ${CONFIG.DEVICE_IP}:${CONFIG.DEVICE_PORT}`);
  console.log(`Syncing to Gym: ${CONFIG.GYM_SLUG} @ ${CONFIG.CLOUD_URL}`);

  const zk = new ZKLib(CONFIG.DEVICE_IP, CONFIG.DEVICE_PORT, 10000, 4000);

  try {
    await zk.createSocket();
    console.log('[DEVICE CONNECTED] Successfully connected to biometric device socket.');

    // Listen for real-time punch events
    zk.getRealTimeLogs(async (data) => {
      console.log(`[REAL-TIME PUNCH] User PIN: ${data.userId}, Time: ${data.attTime}`);
      await postPunchToCloud(data.userId, data.attTime);
    });

    console.log('[READY] Listening for live fingerprint and face punches...');
  } catch (err) {
    console.error(`[DEVICE ERROR] Failed to connect to ${CONFIG.DEVICE_IP}: ${err.message}`);
    console.log('Retrying in 10 seconds...');
    setTimeout(startBridge, 10000);
  }
}

startBridge();
