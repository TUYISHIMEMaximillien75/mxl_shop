# MXL shops

Simple shop inventory manager for small shops in Rwanda. Register your products, track stock, and see capital, revenue and profit at a glance (in RWF).

**Version 1:** products, inventory and dashboard. Sales, expenses, suppliers etc. will come later.

## Tech

- React + TypeScript + Vite
- Tailwind CSS v4, Lucide icons
- Vercel Serverless Functions (`/api`) + Neon Postgres (`@neondatabase/serverless`)

## Run locally

```bash
cp .env.example .env      # then put your Neon connection string in DATABASE_URL
npm install
npm run dev               # http://localhost:5173
```

`npm run dev` also serves the `/api` functions locally (see `vite.config.ts`), so you do **not** need the Vercel CLI.

The `products` table is created automatically on the first request, and sample products are added once. Clear them in **Settings → Clear sample data**.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel: **Add New → Project**, import the repo (framework: Vite is auto-detected).
   - If this folder is inside a bigger repo, set **Root Directory** to `mxl-shops`.
3. In **Settings → Environment Variables**, add `DATABASE_URL` = your Neon connection string.
4. Deploy.

## Project structure

```
api/                 Vercel serverless functions
  products.ts        GET / POST / PUT ?id= / DELETE ?id=
  sample.ts          POST (load) / DELETE (clear) sample products
  _db.ts             Neon client, table setup, row mapping
  _http.ts           error helpers
  _sample-data.ts    demo products
src/
  components/        Sidebar, Layout, StatCard, StockBadge, ProductForm, ProductTable, Modal…
  context/           ProductsContext (data), ToastContext (messages)
  lib/               api client, validation (shared with API), stock math, formatting
  pages/             Dashboard, Inventory, AddProduct, Settings
db/schema.sql        table definition (for reference)
```

## Stock status rules

- **Out of Stock:** 0 items
- **Low Stock:** ≤ 5 items, or ≤ 20% of the initial quantity (change in `src/lib/stock.ts`)
- **In Stock:** otherwise
