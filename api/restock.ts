import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, sql } from './_db.js';

type Row = Record<string, unknown>;

function rowToItem(r: Row) {
  return {
    id:           Number(r.id),
    productId:    r.product_id != null ? Number(r.product_id) : null,
    name:         String(r.name),
    category:     String(r.category),
    sellingPrice: r.selling_price != null ? Number(r.selling_price) : null,
    qty:          Number(r.qty),
    buyPrice:     Number(r.buy_price),
    checked:      Boolean(r.checked),
    createdAt:    String(r.created_at),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSchema();

  /* ── GET /api/restock → list all items ── */
  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM restock_list ORDER BY created_at ASC`;
    return res.status(200).json(rows.map(rowToItem));
  }

  /* ── POST /api/restock → add item ── */
  if (req.method === 'POST') {
    const action = String(req.query.action ?? '');

    // POST ?action=complete → buy ticked items
    if (action === 'complete') {
      const { extraCash = 0, note = null } = (req.body ?? {}) as { extraCash?: number; note?: string };
      const ticked = await sql`SELECT * FROM restock_list WHERE checked = TRUE`;
      if (ticked.length === 0) return res.status(400).json({ error: 'No items are ticked.' });

      // goods cost = what was actually paid for the stock items
      const purchaseCost = ticked.reduce((s, r) => s + Number(r.buy_price) * Number(r.qty), 0);
      // totalRwf stored in DB = actual goods cost (extra_cash is tracked separately in its own column)
      const totalRwf = purchaseCost;

      // Upsert each ticked product, record history, remove ticked rows — in one transaction
      const ops = [];

      for (const r of ticked) {
        const pid    = r.product_id != null ? Number(r.product_id) : null;
        const name   = String(r.name);
        const qty    = Number(r.qty);
        const price  = Number(r.buy_price);
        const cat    = String(r.category);
        const sp     = r.selling_price != null ? Number(r.selling_price) : price;

        if (pid) {
          // Existing product: add stock, record old buy price in purchase_items (we don't overwrite buying_price;
          // the purchase_items line stores the actual price paid this batch).
          ops.push(sql`
            UPDATE products
            SET current_quantity = current_quantity + ${qty},
                initial_quantity = initial_quantity + ${qty}
            WHERE id = ${pid}
          `);
        } else {
          // Brand-new product: insert it
          ops.push(sql`
            INSERT INTO products (name, category, buying_price, selling_price, initial_quantity, current_quantity)
            VALUES (${name}, ${cat}, ${price}, ${sp}, ${qty}, ${qty})
          `);
        }
      }

      // Record purchase header
      ops.push(sql`
        INSERT INTO purchases (total_rwf, note, extra_cash)
        VALUES (${totalRwf}, ${note}, ${Number(extraCash)})
        RETURNING id
      `);

      const results = await sql.transaction(ops);
      const purchaseId = Number((results[results.length - 1] as { id: number }[])[0].id);

      // Insert purchase_items + resolve new product IDs for new products
      for (const r of ticked) {
        const pid    = r.product_id != null ? Number(r.product_id) : null;
        const name   = String(r.name);
        const qty    = Number(r.qty);
        const price  = Number(r.buy_price);
        const subtotal = qty * price;

        let resolvedPid = pid;
        if (!resolvedPid) {
          const rows = await sql`SELECT id FROM products WHERE name = ${name} ORDER BY created_at DESC LIMIT 1`;
          resolvedPid = rows.length ? Number(rows[0].id) : null;
        }

        await sql`
          INSERT INTO purchase_items (purchase_id, product_id, name, qty, buy_price, subtotal)
          VALUES (${purchaseId}, ${resolvedPid}, ${name}, ${qty}, ${price}, ${subtotal})
        `;
      }

      // Remove ticked items
      await sql`DELETE FROM restock_list WHERE checked = TRUE`;

      return res.status(201).json({ purchaseId, totalRwf, extraCash });
    }

    // POST → add new list item
    const { productId, name, category, sellingPrice, qty, buyPrice } = (req.body ?? {}) as {
      productId?: number; name?: string; category?: string; sellingPrice?: number; qty?: number; buyPrice?: number;
    };
    if (!name || !qty || !buyPrice) return res.status(400).json({ error: 'name, qty and buyPrice are required.' });

    const rows = await sql`
      INSERT INTO restock_list (product_id, name, category, selling_price, qty, buy_price)
      VALUES (${productId ?? null}, ${name}, ${category ?? ''}, ${sellingPrice ?? null}, ${qty}, ${buyPrice})
      RETURNING *
    `;
    return res.status(201).json(rowToItem(rows[0]));
  }

  /* ── PATCH /api/restock?id=N → update item (qty, buyPrice, checked) ── */
  if (req.method === 'PATCH') {
    const id = Number(req.query.id);
    if (!id) return res.status(400).json({ error: 'Missing id.' });
    const { qty, buyPrice, checked } = (req.body ?? {}) as { qty?: number; buyPrice?: number; checked?: boolean };

    // Build partial update
    if (checked !== undefined) {
      await sql`UPDATE restock_list SET checked = ${checked} WHERE id = ${id}`;
    }
    if (qty !== undefined) {
      await sql`UPDATE restock_list SET qty = ${qty} WHERE id = ${id}`;
    }
    if (buyPrice !== undefined) {
      await sql`UPDATE restock_list SET buy_price = ${buyPrice} WHERE id = ${id}`;
    }
    const rows = await sql`SELECT * FROM restock_list WHERE id = ${id}`;
    if (!rows.length) return res.status(404).json({ error: 'Not found.' });
    return res.status(200).json(rowToItem(rows[0]));
  }

  /* ── DELETE /api/restock?id=N → remove one item ── */
  if (req.method === 'DELETE') {
    const id = Number(req.query.id);
    if (!id) return res.status(400).json({ error: 'Missing id.' });
    await sql`DELETE FROM restock_list WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
