-- Create stock_movements table to track all stock changes
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  point_of_sale_id UUID NOT NULL REFERENCES points_of_sale(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL, -- 'sale', 'purchase', 'transfer_in', 'transfer_out', 'adjustment', 'loss'
  quantity DECIMAL(10,2) NOT NULL, -- positive for additions, negative for deductions
  reference VARCHAR(100), -- invoice number, transfer reference, etc.
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_pos ON stock_movements(point_of_sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
