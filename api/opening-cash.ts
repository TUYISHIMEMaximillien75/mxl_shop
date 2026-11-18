import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, sql } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSchema();

  if (req.method === 'GET') {
    const rows = await sql`SELECT value FROM app_meta WHERE key = 'opening_cash'`;
    return res.status(200).json({ openingCash: rows.length ? Number(rows[0].value) : 0 });
  }

  if (req.method === 'PUT') {
    const { openingCash } = (req.body ?? {}) as { openingCash?: number };
    if (openingCash == null || isNaN(Number(openingCash))) {
      return res.status(400).json({ error: 'openingCash must be a number.' });
    }
    await sql`
      INSERT INTO app_meta (key, value) VALUES ('opening_cash', ${String(Number(openingCash))})
      ON CONFLICT (key) DO UPDATE SET value = ${String(Number(openingCash))}
    `;
    return res.status(200).json({ openingCash: Number(openingCash) });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
