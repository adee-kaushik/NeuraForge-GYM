import { NextRequest } from 'next/server';
import { logBiometric, MAX_BATCH, parseAttLog, processPunches, summarizeOutcomes, type PunchOutcome } from '@/lib/biometric';
import { handshakeOptions, requireRegisteredDevice, textResponse } from '@/lib/iclock';

/**
 * ZKTeco / eSSL cloud push ("ADMS") endpoint.
 *
 *   GET  /iclock/cdata?SN=...&options=all  -> machine says hello, we reply with settings
 *   POST /iclock/cdata?SN=...&table=ATTLOG -> machine uploads punches (one or hundreds)
 *
 * The machine decides success by our reply text. "OK:<n>" tells it the n records arrived and it may delete them.
 * Any error reply makes it re-send the same records forever, so after we have stored a punch we ALWAYS answer OK,
 * even when the member is unknown or expired. The machine has already decided at the door whether to open it;
 * this endpoint only records what happened.
 */

export async function GET(req: NextRequest) {
  const { device, sn, response } = await requireRegisteredDevice(req);
  if (!device) return response!;

  await logBiometric({
    gymId: device.gymId,
    deviceSerial: sn,
    kind: 'HANDSHAKE',
    summary: `${device.name} connected`,
    rawPreview: `SN=${sn}`,
  });
  return textResponse(handshakeOptions(sn));
}

export async function POST(req: NextRequest) {
  const { device, sn, response } = await requireRegisteredDevice(req);
  if (!device) return response!;

  const table = (req.nextUrl.searchParams.get('table') || '').toUpperCase();
  const body = await req.text().catch(() => '');

  try {
    if (table === 'ATTLOG') {
      const punches = parseAttLog(body);
      if (punches.length === 0) return textResponse('OK:0');

      // Process everything we are about to confirm. Answering OK:<n> tells the machine it may delete n punches,
      // so a big backlog is handled in chunks instead of being cut short.
      const outcomes: PunchOutcome[] = [];
      for (let i = 0; i < punches.length; i += MAX_BATCH) {
        outcomes.push(
          ...(await processPunches({
            gymId: device.gymId,
            punches: punches.slice(i, i + MAX_BATCH),
            source: 'ADMS',
            deviceSerial: sn,
          }))
        );
      }

      await logBiometric({
        gymId: device.gymId,
        deviceSerial: sn,
        kind: 'ATTLOG',
        summary: summarizeOutcomes(outcomes),
        rawPreview: body,
      });
      return textResponse(`OK:${punches.length}`);
    }

    // OPERLOG (user/menu changes on the machine), photos, templates: acknowledged, not used yet.
    const lines = body.split(/\r?\n/).filter((l) => l.trim()).length;
    if (table === 'OPERLOG') {
      await logBiometric({
        gymId: device.gymId,
        deviceSerial: sn,
        kind: 'OPERLOG',
        summary: `${lines} operation log line${lines === 1 ? '' : 's'} received`,
        rawPreview: body,
      });
    }
    return textResponse(`OK:${lines}`);
  } catch (error) {
    // A database failure: tell the machine to try again later instead of discarding its punches.
    await logBiometric({
      gymId: device.gymId,
      deviceSerial: sn,
      kind: 'ERROR',
      summary: `Could not process ${table || 'upload'}: ${error instanceof Error ? error.message : 'unknown error'}`,
      rawPreview: body,
    });
    return textResponse('ERROR: try again later', 500);
  }
}
