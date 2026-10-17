# Biometric machines: how it works and how to set one up

## The idea in one paragraph
A machine at the door recognises a finger, face, palm or card and knows the person only as a **number** (the Biometric ID).
It tells our server "ID 42 punched at 06:31". The server finds the member with Biometric ID 42 in that gym and marks attendance.
The fingerprints and faces themselves stay on the machine; this software never stores them.

## What each part is
| Part | Where | Job |
|---|---|---|
| Biometric ID | `Member.biometricId` | The number a member is enrolled under on the machine. Unique per gym. Digits only. |
| Registered machine | `Device` table, Members → Biometrics Hub | Serial number → gym. This is what authorises a cloud-push machine. |
| Punch store | `BiometricPunch` | Every punch received, once. Re-sent punches are ignored. |
| Connection log | `BiometricLog` | What machines told the server (kept ~14 days). For debugging without a site visit. |
| Gym API key | `Gym.biometricKeyHash` | For the LAN bridge / REST API. Stored hashed; shown once when generated. |
| Core logic | `src/lib/biometric.ts` | One pipeline for machines, REST, the bridge and the Test Punch button. |

## Three ways a machine can connect
1. **Cloud push (eSSL / ZKTeco "ADMS")**: the machine calls `/iclock/cdata` itself. Needs only the server address on the machine and its serial number registered here. Best choice.
2. **LAN bridge**: `public/scripts/neurafitness-sync.js` runs on a PC at the gym, reads the machine on port 4370 and posts to `/api/attendance/biometric`. Needs the gym API key.
3. **REST API**: for Mantra or your own integration. `POST /api/attendance/biometric` with header `x-api-key`.

## Deploying this change (order matters)
1. **Run the migration first**: `prisma/migrations/20261017000000_biometric_devices/migration.sql`
   (`npx prisma migrate deploy`, or paste the file into the Supabase SQL editor; it is safe to run twice).
   It adds `Member.biometricId`, gives every existing member a number, and creates the three new tables.
   Existing numeric codes keep their number (`307` and `MEM-307` become 307); everyone else gets the next free one.
2. Deploy the app. If you deploy before the migration, member screens error because the column is missing.
3. In each gym: Members → Biometrics Hub → register the machine → set the machine's server address.

## Setting up one gym (checklist)
1. Mount the machine, give it power (use a UPS or backup: power cuts are common) and a LAN cable if possible.
2. On the machine set **date, time and timezone to India (IST)**.
3. Hub → **Add machine**: enter the serial number (Menu → System Info → Device Info, or the sticker).
4. On the machine: Menu → Comm. → Cloud Server (ADMS): Server address = your site's hostname, port 443, HTTPS ON.
   - No HTTPS option, or only port 80? Use `tools/adms-relay.js` (see below).
5. Within a minute the machine shows **Online** in the hub.
6. Enroll members under their **Biometric ID** (shown on every member row, in the member's profile, and in the "registered" notice).
7. Scan once. It appears under **Recent machine punches**.

## Rules the system applies
- One attendance per member per **IST day**, however many times they punch. The earliest punch counts.
- A membership is valid through its whole last day (IST), same as "0 days left" in the app.
- Machine times are read as IST. REST timestamps without a timezone are read as IST too.
- A punch from an **expired** member is stored (visible in the hub as "Expired · not counted") but never becomes attendance.
- A punch with a time more than 10 minutes in the future is stored as "Machine clock wrong" and not counted. Older than 31 days: stored, not counted.
- An unregistered machine gets HTTP 403. It keeps its stored punches and retries, so nothing is lost if you register it later.
- After a punch is stored the machine is always answered `OK:<count>`, even for unknown or expired members. Answering with an error would make the machine re-send the same punches forever.

## Important limitation: this software does not open or lock the door
A cloud-push machine decides at the door whether to open, using what it has stored. It uploads the punch afterwards.
So an expired member can still open a door that only checks its own memory. What this system gives you is the record and the alert
(the punch shows as expired), so the desk can follow up. Blocking at the door means removing or disabling that user on the machine,
which is a separate feature (note that deleting a user on the machine also deletes their enrolled fingerprints/face).

## The relay (for machines with no HTTPS)
The site is HTTPS-only. Vercel redirects plain HTTP to HTTPS, and most machines cannot follow redirects, so they fail silently.
`tools/adms-relay.js` accepts the machine's plain HTTP and forwards it over HTTPS. No packages needed, Node 18+:

    TARGET_URL=https://your-site.com PORT=8080 node tools/adms-relay.js

Put the machine's server address = that computer's IP, port = 8080, HTTPS OFF. Run it on an always-on PC or Raspberry Pi at the gym.
If the relay is down the machine keeps its punches and sends them when it is back.

## Troubleshooting
| Symptom | Likely cause | What to check |
|---|---|---|
| Machine never shows Online | Wrong address/port, no internet, or HTTP-only machine | Network cable/WiFi on the machine; address/port/HTTPS setting; try the relay |
| "Unregistered machine … tried to connect" in the connection log | Serial not registered, or typed wrongly | Compare the serial in the log with the one you registered |
| Online, but punches don't appear | Wrong Biometric ID on the machine | Hub shows "Unknown ID": the number on the machine is not any member's Biometric ID |
| Attendance at the wrong time/day | Machine clock or timezone wrong | Set the machine to IST; hub shows "Machine clock wrong" for future times |
| Many punches appear at once | Machine was offline and sent its backlog | Normal; they are placed on the days they happened |
| A member keeps being rejected at the door | Fingerprint quality, sweaty/dirty sensor, injured finger | Re-enroll 2–3 fingers, or use face; clean the sensor |
| "Invalid gym code or API key" from the bridge | Key regenerated or mistyped | Generate a key in the hub and update the bridge settings |
| Machine says memory full | Too many stored logs | Clear logs on the machine after confirming they were received |

## Security notes
- Cloud push cannot carry a secret (machines only send their serial number), so the **serial registry is the protection**. Do not share serial numbers publicly.
- Each gym has its **own** API key; one gym's key cannot be used for another gym. Keys are stored hashed and are never shown again.
- The REST API and the bridge stay switched off for a gym until it generates a key.
- Biometric data is sensitive under India's DPDP Act: get member consent when enrolling, have a privacy notice, and keep templates on the machine only.

## Not yet tested on a real machine
Everything above was tested end to end with simulated machine traffic (batches, re-sends, wrong clocks, expired members, relay, bridge).
It has **not** been run against physical hardware. Firmware differs between models, so on the first real machine:
1. Open the hub's **connection log** while you scan, and check what arrives.
2. If a model sends something unexpected, the raw request is kept in the log, which is what is needed to adjust the parser.
Verify-method labels (fingerprint / face / card) follow the common ZKTeco codes and may differ on some models.
