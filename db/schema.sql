-- MXL shops schema (created automatically by api/_db.ts on first request)

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
);

-- Small key/value table for app flags (e.g. whether sample data was seeded)
CREATE TABLE IF NOT EXISTS app_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
