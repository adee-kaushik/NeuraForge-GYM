import { NextRequest } from 'next/server';
import { requireRegisteredDevice, textResponse } from '@/lib/iclock';

// Newer firmware registers itself before the first handshake and expects a RegistryCode back.
export async function POST(req: NextRequest) {
  const { device, sn, response } = await requireRegisteredDevice(req);
  if (!device) return response!;
  return textResponse(`RegistryCode=${sn}`);
}

export const GET = POST;
