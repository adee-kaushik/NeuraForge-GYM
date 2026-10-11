import { NextRequest } from 'next/server';
import { GET as biometricGET, POST as biometricPOST } from '@/app/api/attendance/biometric/route';

/**
 * Native ZKTeco / eSSL iClock ADMS Webhook Endpoint
 * Hardware terminals (e.g. SilkBio, K30, MB20, UFace) send attendance punches
 * to /iclock/cdata?SN=xxx&table=ATTLOG by default.
 */
export async function GET(req: NextRequest) {
  return biometricGET(req);
}

export async function POST(req: NextRequest) {
  return biometricPOST(req);
}
