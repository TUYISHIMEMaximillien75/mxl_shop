import { neon } from '@neondatabase/serverless';
import type { Product } from '../src/types.js';
import { SAMPLE_PRODUCTS } from './_sample-data.js';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set. Add it to .env (local) or Vercel project settings.');
}

/** Neon HTTP client – works well in serverless functions. */
export const sql = neon(url);

let schemaReady: Promise<void> | null = null;

/** Inserts all sample products in one transaction. */
export async function insertSampleProducts() {
  await sql.transaction(
    SAMPLE_PRODUCTS.map(
      (p) => sql`
        INSERT INTO products
          (name, category, buying_price, selling_price, initial_quantity, current_quantity, is_sample)
        VALUES
          (${p.name}, ${p.category}, ${p.buyingPrice}, ${p.sellingPrice}, ${p.initialQuantity}, ${p.currentQuantity}, TRUE)
      `,
    ),
  );
}

async function setup() {
  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id               SERIAL PRIMARY KEY,
      name             TEXT NOT NULL,
      category         TEXT NOT NULL,
      buying_price     NUMERIC(12,2) NOT NULL CHECK (buying_price > 0),
      selling_price    NUMERIC(12,2) NOT NULL CHECK (selling_price > 0),
      initial_quantity INTEGER NOT NULL CHECK (initial_quantity >= 0),
      current_quantity INTEGER NOT NULL CHECK (current_quantity >= 0),
      date_added       DATE NOT NULL DEFAULT CURRENT_DATE,
      is_sample        BOOLEAN NOT NULL DEFAULT FALSE,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`;

  // Sales tables
  await sql`
    CREATE TABLE IF NOT EXISTS sales (
      id          SERIAL PRIMARY KEY,
      sold_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      total_rwf   NUMERIC(12,2) NOT NULL,
      note        TEXT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sale_items (
      id          SERIAL PRIMARY KEY,
      sale_id     INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      qty         INTEGER NOT NULL CHECK (qty > 0),
      unit_price  NUMERIC(12,2) NOT NULL,
      subtotal    NUMERIC(12,2) NOT NULL
    )
  `;

  // Seed sample products only the very first time the app runs.
  const claimed = await sql`
    INSERT INTO app_meta (key, value) VALUES ('sample_seeded', 'true')
    ON CONFLICT (key) DO NOTHING
    RETURNING key
  `;
  if (claimed.length > 0) await insertSampleProducts();
}

/** Creates tables on first use (once per server instance). */
export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = setup().catch((err) => {
      schemaReady = null; // retry next time
      throw err;
    });
  }
  return schemaReady;
}

type Row = Record<string, unknown>;

function toISODate(v: unknown): string {
  if (v instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  return String(v).slice(0, 10);
}

/** Converts a database row (snake_case, NUMERIC as string) into a Product. */
export function rowToProduct(r: Row): Product {
  return {
    id: Number(r.id),
    name: String(r.name),
    category: String(r.category),
    buyingPrice: Number(r.buying_price),
    sellingPrice: Number(r.selling_price),
    initialQuantity: Number(r.initial_quantity),
    currentQuantity: Number(r.current_quantity),
    dateAdded: toISODate(r.date_added),
    isSample: Boolean(r.is_sample),
  };
}
