PRAGMA defer_foreign_keys = ON;

CREATE TABLE orders_next (
  order_nsu TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  checkout_mode TEXT NOT NULL DEFAULT 'uber_delivery',
  freight_terms_accepted_at TEXT,
  items_json TEXT NOT NULL,
  product_subtotal INTEGER NOT NULL,
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  delivery_fee_actual INTEGER,
  total_amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'brl',
  quote_id TEXT,
  quote_expires_at TEXT,
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

INSERT INTO orders_next (
  order_nsu, status, items_json, product_subtotal, delivery_fee, delivery_fee_actual,
  total_amount, currency, quote_id, quote_expires_at, dropoff_address_json,
  dropoff_phone, dropoff_name, customer_email, notes, infinitepay_checkout_url,
  invoice_slug, transaction_nsu, paid_amount, paid_at, delivery_id, delivery_status,
  delivery_tracking_url, delivery_error, created_at, updated_at
)
SELECT
  order_nsu, status, items_json, product_subtotal, delivery_fee, delivery_fee_actual,
  total_amount, currency, quote_id, quote_expires_at, dropoff_address_json,
  dropoff_phone, dropoff_name, customer_email, notes, infinitepay_checkout_url,
  invoice_slug, transaction_nsu, paid_amount, paid_at, delivery_id, delivery_status,
  delivery_tracking_url, delivery_error, created_at, updated_at
FROM orders;

DROP TABLE orders;
ALTER TABLE orders_next RENAME TO orders;

CREATE INDEX idx_orders_transaction ON orders(transaction_nsu);
CREATE INDEX idx_orders_delivery ON orders(delivery_id);
CREATE INDEX idx_orders_status ON orders(status, created_at);
