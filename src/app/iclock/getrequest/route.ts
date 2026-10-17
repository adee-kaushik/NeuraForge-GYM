import { NextRequest } from 'next/server';
import { requireRegisteredDevice, textResponse } from '@/lib/iclock';

// The machine asks "any commands for me?" every minute or so. We have none yet, so the answer is always OK.
// Kept very light on purpose: every registered machine calls this all day.
export async function GET(req: NextRequest) {
  const { device, response } = await requireRegisteredDevice(req);
  if (!device) return response!;
  return textResponse('OK');
}
