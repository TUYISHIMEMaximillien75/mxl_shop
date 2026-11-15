import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, sql } from './_db.js';
import type { SalePayload } from '../src/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSchema();

  if (req.method === 'POST') {
    const body = req.body as SalePayload;

    if (!Array.isArray(body?.items) || body.items.length === 0) {
      return res.status(400).json({ error: 'Sale must have at least one item.' });
    }

    // Validate each item
    for (const item of body.items) {
      if (!Number.isInteger(item.qty) || item.qty <= 0) {
        return res.status(400).json({ error: 'Each item must have a positive integer quantity.' });
      }
    }

    // Check stock availability
    const ids = body.items.map((i) => i.productId);
    const rows = await sql`SELECT id, name, current_quantity FROM products WHERE id = ANY(${ids})`;
    const stockMap = new Map(rows.map((r) => [Number(r.id), { name: String(r.name), stock: Number(r.current_quantity) }]));

    for (const item of body.items) {
      const p = stockMap.get(item.productId);
      if (!p) return res.status(404).json({ error: `Product ${item.productId} not found.` });
      if (item.qty > p.stock) {
        return res.status(400).json({ error: `Not enough stock for "${p.name}" (available: ${p.stock}, requested: ${item.qty}).` });
      }
    }

    // Compute total
    const totalRwf = body.items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);

    // Record sale + decrement stock in a single transaction
    const results = await sql.transaction([
      // Insert sale record
      sql`INSERT INTO sales (total_rwf, note) VALUES (${totalRwf}, ${body.note ?? null}) RETURNING id, sold_at`,
      // Decrement each product's current_quantity
      ...body.items.map(
        (i) => sql`UPDATE products SET current_quantity = current_quantity - ${i.qty} WHERE id = ${i.productId}`,
      ),
    ]);

    const saleRow = (results[0] as { id: number; sold_at: Date }[])[0];
    const saleId = saleRow.id;

    // Insert sale items
    await sql.transaction(
      body.items.map(
        (i) => sql`
          INSERT INTO sale_items (sale_id, product_id, qty, unit_price, subtotal)
          VALUES (${saleId}, ${i.productId}, ${i.qty}, ${i.unitPrice}, ${i.unitPrice * i.qty})
        `,
      ),
    );

    return res.status(201).json({
      id: saleId,
      soldAt: saleRow.sold_at,
      totalRwf,
      items: body.items.map((i) => ({
        productId: i.productId,
        qty: i.qty,
        unitPrice: i.unitPrice,
        subtotal: i.unitPrice * i.qty,
      })),
    });
  }

  if (req.method === 'GET') {
    // Return recent sales (last 50)
    const sales = await sql`
      SELECT s.id, s.sold_at, s.total_rwf, s.note,
             json_agg(json_build_object(
               'productId', si.product_id,
               'qty',       si.qty,
               'unitPrice', si.unit_price,
               'subtotal',  si.subtotal
             ) ORDER BY si.id) AS items
      FROM sales s
      JOIN sale_items si ON si.sale_id = s.id
      GROUP BY s.id
      ORDER BY s.sold_at DESC
      LIMIT 50
    `;
    return res.status(200).json(
      sales.map((s) => ({
        id: Number(s.id),
        soldAt: s.sold_at,
        totalRwf: Number(s.total_rwf),
        note: s.note,
        items: s.items,
      })),
    );
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
