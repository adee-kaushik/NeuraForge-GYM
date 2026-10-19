'use server';

import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { ensureDatabaseSchema } from '@/lib/db-init';
import type { SupplementItem, SupplementSale } from '@/types';

export async function getSupplements(): Promise<SupplementItem[]> {
  const user = await requireStaff();

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "Supplement" WHERE "gymId" = $1 ORDER BY "category" ASC, "name" ASC
    `, user.gymId);

    if (rows && rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        brand: r.brand || '',
        category: r.category as any,
        price: Number(r.price),
        costPrice: r.costPrice ? Number(r.costPrice) : undefined,
        stock: Number(r.stock),
        unit: r.unit || 'units',
        flavor: r.flavor || undefined,
        description: r.description || undefined,
        imageUrl: r.imageUrl || undefined,
      }));
    }

    return [];
  } catch (err) {
    console.error('getSupplements error:', err);
    throw new Error('Could not load inventory. Please try again.');
  }
}

export async function getSupplementsAndSales(): Promise<{
  supplements: SupplementItem[];
  sales: SupplementSale[];
}> {
  const [supplements, sales] = await Promise.all([
    getSupplements(),
    getSupplementSales(),
  ]);
  return { supplements, sales };
}

export async function saveSupplement(
  item: Omit<SupplementItem, 'id'> & { id?: string }
): Promise<{ ok: boolean; item?: SupplementItem; error?: string }> {
  await ensureDatabaseSchema().catch(() => {});
  const user = await requireStaff();

  const id = item.id || `sup_${Math.random().toString(36).substring(2, 9)}`;
  const price = Math.max(0, Math.round(Number(item.price) || 0));
  const costPrice = item.costPrice ? Math.max(0, Math.round(Number(item.costPrice))) : null;
  const stock = Math.max(0, Math.round(Number(item.stock) || 0));

  try {
    if (item.id) {
      await prisma.$executeRawUnsafe(`
        UPDATE "Supplement"
        SET "name" = $1, "brand" = $2, "category" = $3, "price" = $4, "costPrice" = $5, "stock" = $6, "unit" = $7, "flavor" = $8, "description" = $9
        WHERE "id" = $10 AND "gymId" = $11
      `, item.name, item.brand, item.category, price, costPrice, stock, item.unit || 'units', item.flavor || null, item.description || null, item.id, user.gymId);
    } else {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "Supplement" ("id", "gymId", "name", "brand", "category", "price", "costPrice", "stock", "unit", "flavor", "description")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, id, user.gymId, item.name, item.brand, item.category, price, costPrice, stock, item.unit || 'units', item.flavor || null, item.description || null);
    }

    return {
      ok: true,
      item: {
        id,
        name: item.name,
        brand: item.brand,
        category: item.category,
        price,
        costPrice: costPrice ?? undefined,
        stock,
        unit: item.unit || 'units',
        flavor: item.flavor,
        description: item.description,
      },
    };
  } catch (err: any) {
    console.error('saveSupplement error:', err);
    return { ok: false, error: err?.message || 'Failed to save supplement' };
  }
}

export async function deleteSupplement(id: string): Promise<{ ok: boolean; error?: string }> {
  await ensureDatabaseSchema().catch(() => {});
  const user = await requireStaff();

  try {
    await prisma.$executeRawUnsafe(`
      DELETE FROM "Supplement" WHERE "id" = $1 AND "gymId" = $2
    `, id, user.gymId);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to delete' };
  }
}

export interface RecordSaleInput {
  supplementId?: string;
  supplementName: string;
  customerName: string;
  customerPhone?: string;
  quantity: number;
  unitPrice: number;
  paymentMode: 'UPI' | 'Cash' | 'Card';
  notes?: string;
}

export async function sellSupplement(
  input: RecordSaleInput
): Promise<{ ok: boolean; sale?: SupplementSale; error?: string }> {
  await ensureDatabaseSchema().catch(() => {});
  const user = await requireStaff();

  const id = `sale_${Math.random().toString(36).substring(2, 9)}`;
  const qty = input.quantity;
  const unitPrice = input.unitPrice;
  const totalAmount = qty * unitPrice;
  if (!Number.isInteger(qty) || qty < 1 || qty > 100000 || !Number.isInteger(unitPrice) || unitPrice < 0 || !Number.isSafeInteger(totalAmount) || totalAmount > 2147483647) {
    return { ok: false, error: 'Enter a valid quantity and price.' };
  }
  if (!input.customerName?.trim() || !input.supplementName?.trim() || !['UPI', 'Cash', 'Card'].includes(input.paymentMode)) {
    return { ok: false, error: 'Enter customer, product and payment details.' };
  }

  try {
    await prisma.$transaction(async tx => {
      if (input.supplementId) {
        const updated = await tx.$executeRawUnsafe(`
          UPDATE "Supplement" SET "stock" = "stock" - $1
          WHERE "id" = $2 AND "gymId" = $3 AND "stock" >= $1
        `, qty, input.supplementId, user.gymId);
        if (updated !== 1) throw new Error('INSUFFICIENT_STOCK');
      }
      await tx.$executeRawUnsafe(`
        INSERT INTO "SupplementSale" ("id", "gymId", "supplementId", "supplementName", "customerName", "customerPhone", "quantity", "unitPrice", "totalAmount", "paymentMode", "notes")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, id, user.gymId, input.supplementId || null, input.supplementName, input.customerName, input.customerPhone || null, qty, unitPrice, totalAmount, input.paymentMode, input.notes || null);
    });

    return {
      ok: true,
      sale: {
        id,
        supplementId: input.supplementId,
        supplementName: input.supplementName,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        quantity: qty,
        unitPrice,
        totalAmount,
        paymentMode: input.paymentMode,
        notes: input.notes,
        soldAt: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    console.error('sellSupplement error:', err);
    return { ok: false, error: err?.message === 'INSUFFICIENT_STOCK' ? 'Product not found or insufficient stock.' : 'Failed to record sale. No stock was deducted.' };
  }
}

export async function getSupplementSales(): Promise<SupplementSale[]> {
  const user = await requireStaff();

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "SupplementSale" WHERE "gymId" = $1 ORDER BY "createdAt" DESC LIMIT 50
    `, user.gymId);

    return (rows || []).map((r) => ({
      id: r.id,
      supplementId: r.supplementId || undefined,
      supplementName: r.supplementName,
      customerName: r.customerName,
      customerPhone: r.customerPhone || undefined,
      quantity: Number(r.quantity),
      unitPrice: Number(r.unitPrice),
      totalAmount: Number(r.totalAmount),
      paymentMode: r.paymentMode as any,
      notes: r.notes || undefined,
      soldAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    }));
  } catch (err) {
    console.error('getSupplementSales error:', err);
    return [];
  }
}
