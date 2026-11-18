import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureSchema, sql } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureSchema();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // ── 1. Stock snapshot from products ──────────────────────────────
  const [stockRow] = await sql`
    SELECT
      COUNT(*)                                          AS product_count,
      COALESCE(SUM(current_quantity), 0)                AS total_items,
      COALESCE(SUM(buying_price  * current_quantity), 0) AS stock_cost_value,
      COALESCE(SUM(selling_price * current_quantity), 0) AS stock_sell_value,
      COALESCE(SUM(buying_price  * initial_quantity), 0) AS original_investment
    FROM products
  `;

  // ── 2. Sales totals ───────────────────────────────────────────────
  const [salesRow] = await sql`
    SELECT
      COUNT(DISTINCT s.id)                                       AS sales_count,
      COALESCE(SUM(si.subtotal), 0)                              AS total_revenue,
      COALESCE(SUM(si.qty), 0)                                   AS total_items_sold,
      COALESCE(SUM(si.subtotal - p.buying_price * si.qty), 0)    AS gross_profit
    FROM sales s
    JOIN sale_items si ON si.sale_id = s.id
    JOIN products   p  ON p.id = si.product_id
  `;

  // ── 3. Top 6 products by revenue ─────────────────────────────────
  const topProducts = await sql`
    SELECT
      p.name,
      p.category,
      SUM(si.qty)      AS qty_sold,
      SUM(si.subtotal) AS revenue,
      SUM(si.subtotal - p.buying_price * si.qty) AS profit
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    GROUP BY p.id, p.name, p.category
    ORDER BY revenue DESC
    LIMIT 6
  `;

  // ── 4. Revenue by category ────────────────────────────────────────
  const byCategory = await sql`
    SELECT
      p.category,
      SUM(si.qty)      AS qty_sold,
      SUM(si.subtotal) AS revenue,
      SUM(si.subtotal - p.buying_price * si.qty) AS profit
    FROM sale_items si
    JOIN products p ON p.id = si.product_id
    GROUP BY p.category
    ORDER BY revenue DESC
  `;

  // ── 5. Daily revenue – last 14 days ──────────────────────────────
  const daily = await sql`
    SELECT
      to_char(s.sold_at AT TIME ZONE 'Africa/Kigali', 'YYYY-MM-DD') AS day,
      SUM(s.total_rwf)                              AS revenue,
      COUNT(*)                                      AS sales_count
    FROM sales s
    WHERE s.sold_at >= NOW() - INTERVAL '14 days'
    GROUP BY day
    ORDER BY day ASC
  `;

  // ── 6. Purchase totals ────────────────────────────────────────────
  const [purchRow] = await sql`
    SELECT
      COUNT(*)                        AS purchase_count,
      COALESCE(SUM(total_rwf), 0)     AS total_spent,
      COALESCE(SUM(extra_cash), 0)    AS total_extra_cash
    FROM purchases
  `;

  // ── 7. Opening cash ───────────────────────────────────────────────
  const metaRows = await sql`SELECT value FROM app_meta WHERE key = 'opening_cash'`;
  const openingCash = metaRows.length ? Number(metaRows[0].value) : 0;

  const totalRevenue   = Number(salesRow.total_revenue);
  const totalSpent     = Number(purchRow.total_spent);
  const totalExtraCash = Number(purchRow.total_extra_cash);
  // Real cash balance = opening + all sales received + extra cash added − all purchases paid
  const cashBalance = openingCash + totalRevenue + totalExtraCash - totalSpent;

  return res.status(200).json({
    openingCash,
    cashBalance,
    stock: {
      productCount:       Number(stockRow.product_count),
      totalItems:         Number(stockRow.total_items),
      stockCostValue:     Number(stockRow.stock_cost_value),
      stockSellValue:     Number(stockRow.stock_sell_value),
      originalInvestment: Number(stockRow.original_investment),
    },
    sales: {
      salesCount:     Number(salesRow.sales_count),
      totalRevenue,
      totalItemsSold: Number(salesRow.total_items_sold),
      grossProfit:    Number(salesRow.gross_profit),
    },
    purchases: {
      purchaseCount: Number(purchRow.purchase_count),
      totalSpent,
      totalExtraCash,
    },
    topProducts: topProducts.map((r) => ({
      name:     String(r.name),
      category: String(r.category),
      qtySold:  Number(r.qty_sold),
      revenue:  Number(r.revenue),
      profit:   Number(r.profit),
    })),
    byCategory: byCategory.map((r) => ({
      category: String(r.category),
      qtySold:  Number(r.qty_sold),
      revenue:  Number(r.revenue),
      profit:   Number(r.profit),
    })),
    daily: daily.map((r) => ({
      day:        String(r.day).slice(0, 10),
      revenue:    Number(r.revenue),
      salesCount: Number(r.sales_count),
    })),
  });
}
