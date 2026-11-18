import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, sql } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSchema();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const rows = await sql`
    SELECT p.id, p.bought_at, p.total_rwf, p.note, p.extra_cash,
           json_agg(json_build_object(
             'productId', pi.product_id,
             'name',      pi.name,
             'qty',       pi.qty,
             'buyPrice',  pi.buy_price,
             'subtotal',  pi.subtotal
           ) ORDER BY pi.id) AS items
    FROM purchases p
    JOIN purchase_items pi ON pi.purchase_id = p.id
    GROUP BY p.id
    ORDER BY p.bought_at DESC
    LIMIT 100
  `;

  return res.status(200).json(rows.map((r) => ({
    id:        Number(r.id),
    boughtAt:  String(r.bought_at),
    totalRwf:  Number(r.total_rwf),
    extraCash: Number(r.extra_cash),
    note:      r.note,
    items:     r.items,
  })));
}
