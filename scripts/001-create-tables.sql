-- Eclipse Lunc Bar - Database Schema
-- Run this script against your PostgreSQL database to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'manager', 'cashier', 'waiter', 'warehouse')),
  point_of_sale_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SETTINGS / CONFIGURATION
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('tva_rate', '18'),
  ('currency', 'CDF'),
  ('restaurant_name', 'Eclipse Lunc Bar'),
  ('restaurant_address', ''),
  ('restaurant_phone', '')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- POINTS OF SALE
-- ============================================
CREATE TABLE IF NOT EXISTS points_of_sale (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key to users
ALTER TABLE users
  ADD CONSTRAINT fk_users_pos FOREIGN KEY (point_of_sale_id) REFERENCES points_of_sale(id) ON DELETE SET NULL;

-- ============================================
-- PRODUCT CATEGORIES (Warehouse)
-- ============================================
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUCTS (Warehouse items)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  storage_unit VARCHAR(100) NOT NULL DEFAULT 'carton',
  sale_unit VARCHAR(100) NOT NULL DEFAULT 'plat',
  conversion_rate INTEGER NOT NULL DEFAULT 1,
  purchase_price DECIMAL(12, 2) DEFAULT 0,
  sale_price DECIMAL(12, 2) DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUPPLIERS
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  contact VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WAREHOUSE STOCK
-- ============================================
CREATE TABLE IF NOT EXISTS warehouse_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  theoretical_qty INTEGER DEFAULT 0,
  real_qty INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id)
);

-- ============================================
-- SUPPLY ENTRIES (Approvisionnement - IN)
-- ============================================
CREATE TABLE IF NOT EXISTS supply_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity_cartons INTEGER NOT NULL,
  unit_cost DECIMAL(12, 2) NOT NULL,
  total_cost DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STOCK EXITS (Sorties vers POS)
-- ============================================
CREATE TABLE IF NOT EXISTS stock_exits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference VARCHAR(50) UNIQUE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  point_of_sale_id UUID REFERENCES points_of_sale(id) ON DELETE CASCADE,
  quantity_cartons INTEGER NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STOCK ADJUSTMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  location_type VARCHAR(20) NOT NULL CHECK (location_type IN ('warehouse', 'pos')),
  location_id UUID,
  old_qty INTEGER NOT NULL,
  new_qty INTEGER NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- POS STOCK
-- ============================================
CREATE TABLE IF NOT EXISTS pos_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  point_of_sale_id UUID REFERENCES points_of_sale(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity_units INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(point_of_sale_id, product_id)
);

-- ============================================
-- MENU CATEGORIES (for client-facing menu)
-- ============================================
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MENU ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(12, 2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  point_of_sale_id UUID REFERENCES points_of_sale(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MENU ITEM OPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS menu_item_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price_extra DECIMAL(12, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- ============================================
-- TABLES (Restaurant tables)
-- ============================================
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  point_of_sale_id UUID REFERENCES points_of_sale(id) ON DELETE CASCADE,
  table_number VARCHAR(20) NOT NULL,
  capacity INTEGER DEFAULT 4,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
  qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  point_of_sale_id UUID REFERENCES points_of_sale(id) ON DELETE CASCADE,
  table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  status VARCHAR(30) DEFAULT 'received' CHECK (status IN ('received', 'preparing', 'ready', 'delivered', 'cancelled')),
  order_type VARCHAR(20) DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway', 'qr_order')),
  subtotal DECIMAL(12, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  client_name VARCHAR(255),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDER ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL,
  options_json JSONB DEFAULT '[]',
  options_total DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENTS / INVOICES
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash', 'mobile_money', 'mixed', 'card')),
  amount_cash DECIMAL(12, 2) DEFAULT 0,
  amount_mobile DECIMAL(12, 2) DEFAULT 0,
  amount_card DECIMAL(12, 2) DEFAULT 0,
  total_paid DECIMAL(12, 2) NOT NULL,
  change_amount DECIMAL(12, 2) DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CASH REGISTER SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS cash_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  point_of_sale_id UUID REFERENCES points_of_sale(id) ON DELETE CASCADE,
  opened_by UUID REFERENCES users(id),
  closed_by UUID REFERENCES users(id),
  opening_amount DECIMAL(12, 2) DEFAULT 0,
  closing_amount DECIMAL(12, 2),
  total_sales DECIMAL(12, 2) DEFAULT 0,
  total_cash DECIMAL(12, 2) DEFAULT 0,
  total_mobile DECIMAL(12, 2) DEFAULT 0,
  total_card DECIMAL(12, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- ============================================
-- EXPENSES
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  point_of_sale_id UUID REFERENCES points_of_sale(id) ON DELETE SET NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  point_of_sale_id UUID REFERENCES points_of_sale(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  related_order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Create default super admin (password: admin123 - change immediately!)
-- Password hash for 'admin123' using bcrypt
-- ============================================
-- Note: You must create the first admin user via the setup endpoint or manually insert one.

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orders_pos ON orders(point_of_sale_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_product ON warehouse_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_pos_stock_pos ON pos_stock(point_of_sale_id);
CREATE INDEX IF NOT EXISTS idx_supply_entries_product ON supply_entries(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_exits_product ON stock_exits(product_id);
CREATE INDEX IF NOT EXISTS idx_notifications_pos ON notifications(point_of_sale_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_pos ON menu_items(point_of_sale_id);
