import { NextRequest } from 'next/server';
import { requireRegisteredDevice, textResponse } from '@/lib/iclock';

export async function GET(req: NextRequest) {
  const { device, response } = await requireRegisteredDevice(req);
  if (!device) return response!;
  return textResponse('OK');
}
