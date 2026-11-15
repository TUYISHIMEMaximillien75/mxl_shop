import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, insertSampleProducts, sql } from './_db.js';
import { sendError, withErrors } from './_http.js';

/**
 * /api/sample
 *   POST   -> add the sample products
 *   DELETE -> remove all sample products (your own products are kept)
 */
export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  await ensureSchema();

  if (req.method === 'POST') {
    await insertSampleProducts();
    res.status(201).json({ ok: true });
    return;
  }

  if (req.method === 'DELETE') {
    const rows = await sql`DELETE FROM products WHERE is_sample = TRUE RETURNING id`;
    res.status(200).json({ ok: true, deleted: rows.length });
    return;
  }

  res.setHeader('Allow', 'POST, DELETE');
  sendError(res, 405, 'Method not allowed');
});
