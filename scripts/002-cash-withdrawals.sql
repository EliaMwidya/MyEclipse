-- Cash Withdrawals table
CREATE TABLE IF NOT EXISTS cash_withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference VARCHAR(50) UNIQUE NOT NULL,
  cash_session_id UUID REFERENCES cash_sessions(id) ON DELETE CASCADE,
  point_of_sale_id UUID REFERENCES points_of_sale(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add waiter_id to orders for tracking which waiter serves each order
ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiter_id UUID REFERENCES users(id);

-- Add waiter_id to payments for tracking
ALTER TABLE payments ADD COLUMN IF NOT EXISTS waiter_id UUID REFERENCES users(id);

-- Accounting journal entries
CREATE TABLE IF NOT EXISTS accounting_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference VARCHAR(100),
  description TEXT NOT NULL,
  entry_type VARCHAR(30) NOT NULL CHECK (entry_type IN ('revenue', 'expense', 'supply', 'withdrawal', 'adjustment')),
  debit DECIMAL(12, 2) DEFAULT 0,
  credit DECIMAL(12, 2) DEFAULT 0,
  point_of_sale_id UUID REFERENCES points_of_sale(id) ON DELETE SET NULL,
  related_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounting_date ON accounting_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_accounting_type ON accounting_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_cash_withdrawals_session ON cash_withdrawals(cash_session_id);
