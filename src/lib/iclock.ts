import { NextRequest, NextResponse } from 'next/server';
import { clientIp, findRegisteredDevice, logUnregisteredOnce, normalizeSerial } from '@/lib/biometric';

// Shared plumbing for the ZKTeco / eSSL cloud-push ("ADMS", "iClock") endpoints under /iclock/*.
// These machines speak plain text, not JSON, and they judge success by the exact text we reply with.

export const textResponse = (body: string, status = 200): NextResponse =>
  new NextResponse(body, { status, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } });

export const serialFrom = (req: NextRequest): string =>
  normalizeSerial(req.nextUrl.searchParams.get('SN') || req.nextUrl.searchParams.get('sn'));

/**
 * What the machine is told to do after it connects. Notes on the values:
 *  - Delay / ErrorDelay: seconds between polls. 60 keeps load low; punches are uploaded instantly anyway (Realtime=1).
 *  - ATTLOGStamp=None: send every punch you have stored. Re-sent ones are ignored on our side.
 *  - OPERLOGStamp=9999: do not upload old operation logs.
 *  - No TimeZone line on purpose: the machine keeps the clock/timezone the installer set, and we read it as IST.
 */
export function handshakeOptions(sn: string): string {
  return [
    `GET OPTION FROM: ${sn}`,
    'ATTLOGStamp=None',
    'OPERLOGStamp=9999',
    'ATTPHOTOStamp=None',
    'ErrorDelay=60',
    'Delay=60',
    'TransTimes=00:00;14:05',
    'TransInterval=1',
    'TransFlag=TransData AttLog',
    'Realtime=1',
    'Encrypt=None',
    '',
  ].join('\n');
}

/**
 * Looks up the machine behind a request. Unregistered machines get a 403, which makes them KEEP their
 * stored punches and try again later, so nothing is lost if the owner registers the serial number afterwards.
 */
export async function requireRegisteredDevice(req: NextRequest) {
  const sn = serialFrom(req);
  if (!sn) return { device: null, sn, response: textResponse('ERROR: SN missing', 400) };

  const device = await findRegisteredDevice(sn, clientIp(req));
  if (!device) {
    await logUnregisteredOnce(sn, clientIp(req), `${req.method} ${req.nextUrl.pathname}${req.nextUrl.search}`);
    return { device: null, sn, response: textResponse('ERROR: device not registered', 403) };
  }
  return { device, sn, response: null };
}
