'use server';

import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/auth';
import { ensureDatabaseSchema } from '@/lib/db-init';
import type { SupplementItem, SupplementSale } from '@/types';

const DEFAULT_SUPPLEMENTS: Omit<SupplementItem, 'id'>[] = [
  {
    name: 'Gold Standard 100% Whey (2 kg)',
    brand: 'Optimum Nutrition',
    category: 'Protein',
    price: 6899,
    costPrice: 5400,
    stock: 14,
    unit: 'tubs',
    flavor: 'Double Rich Chocolate',
    description: '24g blended whey protein (isolate, concentrate, peptides) per scoop.',
  },
  {
    name: 'Biozyme Performance Whey (2 kg)',
    brand: 'MuscleBlaze',
    category: 'Protein',
    price: 4999,
    costPrice: 3800,
    stock: 18,
    unit: 'tubs',
    flavor: 'Rich Chocolate',
    description: 'Enhanced Absorption Formula (EAF) certified by Labdoor USA.',
  },
  {
    name: 'Creapure Micronized Creatine (250g)',
    brand: 'MuscleBlaze',
    category: 'Creatine',
    price: 1299,
    costPrice: 900,
    stock: 25,
    unit: 'jars',
    flavor: 'Unflavored',
    description: '99.99% pure German Creapure for explosive strength and muscle fullness.',
  },
  {
    name: 'C4 Original Pre-Workout (30 Servings)',
    brand: 'Cellucor',
    category: 'Pre-Workout',
    price: 2499,
    costPrice: 1800,
    stock: 12,
    unit: 'jars',
    flavor: 'Fruit Punch',
    description: 'Explosive energy, muscular endurance and sharp mental focus.',
  },
  {
    name: 'Xtend Original BCAA (30 Servings)',
    brand: 'Scivation',
    category: 'BCAA',
    price: 2199,
    costPrice: 1600,
    stock: 10,
    unit: 'jars',
    flavor: 'Blue Raspberry',
    description: '7g BCAAs in 2:1:1 ratio plus electrolytes for intra-workout hydration.',
  },
  {
    name: 'High Protein Peanut Butter (1 kg)',
    brand: 'Pintola',
    category: 'Snacks',
    price: 499,
    costPrice: 350,
    stock: 30,
    unit: 'jars',
    flavor: 'Dark Chocolate Crunchy',
    description: '30g protein per 100g, 100% roasted peanuts with zero added sugar.',
  },
  {
    name: 'Pro 20g Protein Bar (Pack of 6)',
    brand: 'RiteBite Max Protein',
    category: 'Snacks',
    price: 720,
    costPrice: 500,
    stock: 20,
    unit: 'packs',
    flavor: 'Choco Delite',
    description: '20g protein, 5g fiber, 21 essential vitamins and minerals.',
  },
  {
    name: 'Pro Matte Steel Shaker (750 ml)',
    brand: 'NeuraFitness',
    category: 'Accessories',
    price: 699,
    costPrice: 380,
    stock: 22,
    unit: 'bottles',
    flavor: 'Matte Stealth Black',
    description: '100% leakproof stainless steel gym shaker with mixer ball.',
  },
];

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

    // Seed defaults if brand new gym
    for (const def of DEFAULT_SUPPLEMENTS) {
      const id = `sup_${Math.random().toString(36).substring(2, 9)}`;
      await prisma.$executeRawUnsafe(`
        INSERT INTO "Supplement" ("id", "gymId", "name", "brand", "category", "price", "costPrice", "stock", "unit", "flavor", "description")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, id, user.gymId, def.name, def.brand, def.category, def.price, def.costPrice ?? null, def.stock, def.unit, def.flavor ?? null, def.description ?? null).catch(() => {});
    }

    const reloaded = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "Supplement" WHERE "gymId" = $1 ORDER BY "category" ASC, "name" ASC
    `, user.gymId).catch(() => []);

    return (reloaded || []).map((r) => ({
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
  } catch (err) {
    console.error('getSupplements error:', err);
    return DEFAULT_SUPPLEMENTS.map((d, i) => ({
      ...d,
      id: `default_${i}`,
    }));
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
  const qty = Math.max(1, Math.round(Number(input.quantity) || 1));
  const unitPrice = Math.max(0, Math.round(Number(input.unitPrice) || 0));
  const totalAmount = qty * unitPrice;

  try {
    // 1. Record the sale
    await prisma.$executeRawUnsafe(`
      INSERT INTO "SupplementSale" ("id", "gymId", "supplementId", "supplementName", "customerName", "customerPhone", "quantity", "unitPrice", "totalAmount", "paymentMode", "notes")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, id, user.gymId, input.supplementId || null, input.supplementName, input.customerName, input.customerPhone || null, qty, unitPrice, totalAmount, input.paymentMode, input.notes || null);

    // 2. Decrement stock if linked to supplement
    if (input.supplementId) {
      await prisma.$executeRawUnsafe(`
        UPDATE "Supplement"
        SET "stock" = GREATEST(0, "stock" - $1)
        WHERE "id" = $2 AND "gymId" = $3
      `, qty, input.supplementId, user.gymId).catch(() => {});
    }

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
    return { ok: false, error: err?.message || 'Failed to record sale' };
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
