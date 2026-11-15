import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, rowToProduct, sql } from './_db.js';
import { parseId, sendError, withErrors } from './_http.js';
import { validateProduct } from '../src/lib/validation.js';

/**
 * /api/products
 *   GET                 -> list all products
 *   GET    ?id=123      -> one product
 *   POST   (body)       -> create product
 *   PUT    ?id=123 body -> update product
 *   DELETE ?id=123      -> delete product
 */
export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  await ensureSchema();
  const id = parseId(req.query.id);

  switch (req.method) {
    case 'GET': {
      if (id) {
        const rows = await sql`SELECT * FROM products WHERE id = ${id}`;
        if (rows.length === 0) return sendError(res, 404, 'Product not found');
        res.status(200).json(rowToProduct(rows[0]));
        return;
      }
      const rows = await sql`SELECT * FROM products ORDER BY created_at DESC, id DESC`;
      res.status(200).json(rows.map(rowToProduct));
      return;
    }

    case 'POST': {
      const { errors, value } = validateProduct(req.body ?? {});
      if (!value) return sendError(res, 400, 'Please fix the highlighted fields', errors);
      const rows = await sql`
        INSERT INTO products
          (name, category, buying_price, selling_price, initial_quantity, current_quantity, date_added)
        VALUES
          (${value.name}, ${value.category}, ${value.buyingPrice}, ${value.sellingPrice},
           ${value.initialQuantity}, ${value.currentQuantity}, ${value.dateAdded})
        RETURNING *
      `;
      res.status(201).json(rowToProduct(rows[0]));
      return;
    }

    case 'PUT': {
      if (!id) return sendError(res, 400, 'Missing product id');
      const { errors, value } = validateProduct(req.body ?? {});
      if (!value) return sendError(res, 400, 'Please fix the highlighted fields', errors);
      const rows = await sql`
        UPDATE products SET
          name = ${value.name},
          category = ${value.category},
          buying_price = ${value.buyingPrice},
          selling_price = ${value.sellingPrice},
          initial_quantity = ${value.initialQuantity},
          current_quantity = ${value.currentQuantity},
          date_added = ${value.dateAdded}
        WHERE id = ${id}
        RETURNING *
      `;
      if (rows.length === 0) return sendError(res, 404, 'Product not found');
      res.status(200).json(rowToProduct(rows[0]));
      return;
    }

    case 'DELETE': {
      if (!id) return sendError(res, 400, 'Missing product id');
      const rows = await sql`DELETE FROM products WHERE id = ${id} RETURNING id`;
      if (rows.length === 0) return sendError(res, 404, 'Product not found');
      res.status(200).json({ ok: true });
      return;
    }

    default:
      res.setHeader('Allow', 'GET, POST, PUT, DELETE');
      return sendError(res, 405, 'Method not allowed');
  }
});
