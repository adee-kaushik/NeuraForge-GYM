import { NextRequest } from 'next/server';
import { requireRegisteredDevice, textResponse } from '@/lib/iclock';

// The machine reports the result of a command we sent it. We do not send any yet; acknowledge so it never retries.
export async function POST(req: NextRequest) {
  const { device, response } = await requireRegisteredDevice(req);
  if (!device) return response!;
  return textResponse('OK');
}
