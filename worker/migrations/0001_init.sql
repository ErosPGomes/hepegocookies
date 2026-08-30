CREATE TABLE IF NOT EXISTS quotes (
  quote_id TEXT PRIMARY KEY,
  fee INTEGER NOT NULL,
  currency TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  dropoff_address_json TEXT NOT NULL,
  dropoff_phone TEXT NOT NULL,
  dropoff_name TEXT NOT NULL,
  used_by_order_nsu TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  order_nsu TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  items_json TEXT NOT NULL,
  product_subtotal INTEGER NOT NULL,
  delivery_fee INTEGER NOT NULL,
  delivery_fee_actual INTEGER,
  total_amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'brl',
  quote_id TEXT NOT NULL,
  quote_expires_at TEXT NOT NULL,
  dropoff_address_json TEXT NOT NULL,
  dropoff_phone TEXT NOT NULL,
  dropoff_name TEXT NOT NULL,
  customer_email TEXT,
  notes TEXT,
  infinitepay_checkout_url TEXT,
  invoice_slug TEXT,
  transaction_nsu TEXT,
  paid_amount INTEGER,
  paid_at TEXT,
  delivery_id TEXT UNIQUE,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  delivery_tracking_url TEXT,
  delivery_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (quote_id) REFERENCES quotes(quote_id)
);

CREATE INDEX IF NOT EXISTS idx_orders_transaction ON orders(transaction_nsu);
CREATE INDEX IF NOT EXISTS idx_orders_delivery ON orders(delivery_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at);

CREATE TABLE IF NOT EXISTS oauth_tokens (
  provider TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  received_at TEXT NOT NULL,
  processed_at TEXT
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (key, window_start)
);
