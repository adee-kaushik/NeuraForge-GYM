// Optional isolated PostgreSQL-compatible check: npm install --no-save --package-lock=false @electric-sql/pglite
// Run: node tools/check-migrations.mjs
import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
try {
  const folders = (await readdir('prisma/migrations', { withFileTypes: true })).filter(e => e.isDirectory()).map(e => e.name).sort();
  for (const folder of folders) {
    await db.exec(await readFile(`prisma/migrations/${folder}/migration.sql`, 'utf8'));
    console.log(`Applied ${folder}`);
  }
  const reconcile = await readFile(`prisma/migrations/${folders.at(-1)}/migration.sql`, 'utf8');
  await db.exec(reconcile);
  console.log('Reconciliation migration is repeatable.');
  const tables = await db.query(`SELECT relname FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND NOT relrowsecurity`);
  assert.equal(tables.rows.length, 0, 'Every application table must enable RLS');
  await db.exec(`INSERT INTO "Gym" (id,name,slug) VALUES ('test-gym','Test Gym','test-gym');
    INSERT INTO "Supplement" (id,"gymId",name,price,stock) VALUES ('test-product','test-gym','Product',100,2);`);
  // Reproduce the live legacy schema: a TEXT column and no enum type.
  await db.exec(`ALTER TABLE "Gym" ALTER COLUMN "attendanceMode" DROP DEFAULT;
    ALTER TABLE "Gym" ALTER COLUMN "attendanceMode" TYPE TEXT USING "attendanceMode"::text;
    DROP TYPE "AttendanceMode";
    UPDATE "Gym" SET "attendanceMode"='BIOMETRIC';`);
  await db.exec(reconcile);
  await db.exec(reconcile);
  const mode = await db.query(`SELECT "attendanceMode", pg_typeof("attendanceMode")::text AS type FROM "Gym" WHERE id='test-gym'`);
  assert.equal(mode.rows[0].attendanceMode, 'BIOMETRIC');
  assert.equal(mode.rows[0].type, '"AttendanceMode"');
  console.log('Legacy text attendance mode repaired without changing values.');
  // Execute the same guarded update used in the sales action.
  const sold = await db.query(`UPDATE "Supplement" SET stock=stock-$1 WHERE id=$2 AND "gymId"=$3 AND stock >= $1 RETURNING stock`,[2,'test-product','test-gym']);
  assert.equal(sold.rows[0].stock,0);
  const oversell = await db.query(`UPDATE "Supplement" SET stock=stock-$1 WHERE id=$2 AND "gymId"=$3 AND stock >= $1 RETURNING stock`,[1,'test-product','test-gym']);
  assert.equal(oversell.rows.length,0);
  console.log('RLS and stock decrement checks passed.');
} finally { await db.close(); }
