-- Migration: Add credit sales, discounts, exchange rate, and cancel reason
-- Run this script to add new features

-- ============================================
-- NEW SETTINGS
-- ============================================
INSERT INTO settings (key, value) VALUES
  ('exchange_rate_usd_cdf', '2800'),
  ('low_stock_threshold_global', '10')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- ADD DISCOUNT & CREDIT COLUMNS TO ORDERS
-- ============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_credit_sale BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- ============================================
-- CREDITS TABLE (Track credit sales and payments)
-- ============================================
CREATE TABLE IF NOT EXISTS credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50),
  total_amount DECIMAL(12, 2) NOT NULL,
  paid_amount DECIMAL(12, 2) DEFAULT 0,
  remaining_amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  due_date DATE,
  notes TEXT,
  point_of_sale_id UUID REFERENCES points_of_sale(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CREDIT PAYMENTS TABLE (Track partial payments)
-- ============================================
CREATE TABLE IF NOT EXISTS credit_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credit_id UUID REFERENCES credits(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash', 'mobile_money', 'card')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADD WAITER_ID TO PAYMENTS TABLE
-- ============================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS waiter_id UUID REFERENCES users(id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_credits_order ON credits(order_id);
CREATE INDEX IF NOT EXISTS idx_credits_status ON credits(status);
CREATE INDEX IF NOT EXISTS idx_credits_pos ON credits(point_of_sale_id);
CREATE INDEX IF NOT EXISTS idx_credit_payments_credit ON credit_payments(credit_id);
CREATE INDEX IF NOT EXISTS idx_orders_is_credit ON orders(is_credit_sale);
