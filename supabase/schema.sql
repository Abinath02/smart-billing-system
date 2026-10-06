-- ====================================================================
-- RESTAURANT SMART BILLING SYSTEM - SUPABASE DATABASE SCHEMA
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom ENUM Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'cashier', 'kitchen');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'cooking', 'ready', 'paid', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_mode AS ENUM ('cash', 'card', 'upi', 'online', 'unpaid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Sequence for Human-Readable Bill Numbers (e.g. BILL-1001)
CREATE SEQUENCE IF NOT EXISTS bill_number_seq START WITH 1001;

-- ====================================================================
-- 4. TABLES CREATION
-- ====================================================================

-- TABLE: profiles (Role-based users linked with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'cashier',
    phone TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- TABLE: waiters
CREATE TABLE IF NOT EXISTS public.waiters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    emp_code TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- TABLE: menu_items
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- e.g., 'Starters', 'Main Course', 'Desserts', 'Beverages'
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    description TEXT,
    is_available BOOLEAN DEFAULT true NOT NULL,
    preparation_time_mins INTEGER DEFAULT 15,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- TABLE: offers
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    discount_details JSONB NOT NULL DEFAULT '{"type": "percentage", "value": 10}'::jsonb,
    poster_url TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    start_date TIMESTAMPTZ DEFAULT timezone('utc', now()),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- TABLE: orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_no TEXT UNIQUE NOT NULL DEFAULT ('BILL-' || nextval('bill_number_seq')::text),
    table_no TEXT NOT NULL,
    waiter_id UUID REFERENCES public.waiters(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    subtotal NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (subtotal >= 0),
    tax_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (tax_amount >= 0),
    discount_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (discount_amount >= 0),
    total_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (total_amount >= 0),
    status order_status DEFAULT 'pending' NOT NULL,
    payment_mode payment_mode DEFAULT 'unpaid' NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- TABLE: order_items (Mapping orders to menu items)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL, -- Preserves historical record if item changes
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    special_instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- ====================================================================
-- 5. INDEXES FOR HIGH PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(is_available);

-- ====================================================================
-- 6. AUTOMATIC TIMESTAMP UPDATER FUNCTION
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_menu_items_updated_at
    BEFORE UPDATE ON public.menu_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 7. TRIGGER: AUTO-CREATE PROFILE ON SUPABASE AUTH SIGNUP
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'cashier')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Menu Items & Offers: readable by all (staff & customers for QR menu ordering)
CREATE POLICY "Public can view available menu items" ON public.menu_items
    FOR SELECT USING (true);

CREATE POLICY "Staff can update menu items" ON public.menu_items
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage menu items" ON public.menu_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Public can view active offers" ON public.offers
    FOR SELECT USING (is_active = true);

CREATE POLICY "Staff and Admins can manage offers" ON public.offers
    FOR ALL USING (auth.role() = 'authenticated');

-- Waiters: viewable and insertable by authenticated staff (Kitchen/Admin/Cashier)
CREATE POLICY "Staff can view waiters" ON public.waiters
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can manage waiters" ON public.waiters
    FOR ALL USING (auth.role() = 'authenticated');

-- Orders & Order Items: readable and writable by authenticated staff
CREATE POLICY "Staff can view all orders" ON public.orders
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can insert/update orders" ON public.orders
    FOR ALL USING (auth.role() = 'authenticated');

-- Public / Anonymous QR Customer can place orders
CREATE POLICY "Customers can insert orders" ON public.orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Customers can view their placed orders" ON public.orders
    FOR SELECT USING (true);

CREATE POLICY "Staff can view order items" ON public.order_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff can insert/update order items" ON public.order_items
    FOR ALL USING (auth.role() = 'authenticated');

-- Public / Anonymous QR Customer can insert their order items
CREATE POLICY "Customers can insert order items" ON public.order_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Customers can view order items" ON public.order_items
    FOR SELECT USING (true);

-- Profiles: users can read their own profile, admins can read all
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view and manage all profiles" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- ====================================================================
-- 9. REALTIME SUBSCRIPTIONS (For Kitchen Display & Live Billing POS)
-- ====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- ====================================================================
-- 10. SAMPLE SEED DATA FOR TESTING
-- ====================================================================
INSERT INTO public.waiters (name, phone, emp_code) VALUES
('Ramesh Kumar', '9876543210', 'W-01'),
('Suresh Raina', '9876543211', 'W-02'),
('Priya Sundar', '9876543212', 'W-03')
ON CONFLICT (emp_code) DO NOTHING;

INSERT INTO public.menu_items (id, name, category, price, is_available, preparation_time_mins, description, image_url) VALUES
('11111111-1111-1111-1111-111111111111', 'Paneer Butter Masala', 'Main Course', 240.00, true, 20, 'Rich creamy cottage cheese gravy in rich cashew tomato curry', 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80'),
('22222222-2222-2222-2222-222222222222', 'Chicken Biryani Special', 'Main Course', 280.00, true, 15, 'Aromatic basmati rice cooked with tender spiced chicken & boiled egg', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80'),
('33333333-3333-3333-3333-333333333333', 'Crispy Corn Pepper Fry', 'Starters', 160.00, true, 10, 'Golden fried sweet corn tossed with herbs, scallions and black pepper', 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=600&q=80'),
('44444444-4444-4444-4444-444444444444', 'Butter Garlic Naan', 'Breads', 45.00, true, 8, 'Soft leavened clay oven flatbread glazed with melted garlic butter', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80'),
('55555555-5555-5555-5555-555555555555', 'Cold Coffee with Ice Cream', 'Beverages', 120.00, true, 5, 'Thick blended coffee topped with premium vanilla ice cream & cocoa', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80'),
('66666666-6666-6666-6666-666666666666', 'Gulab Jamun (2 pcs)', 'Desserts', 80.00, true, 5, 'Warm milk solids dumplings soaked in cardamom rose syrup', 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=600&q=80')
ON CONFLICT (id) DO NOTHING;

-- Seed Sample Offers
INSERT INTO public.offers (id, item_id, title, discount_details, poster_url, is_active) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Chef Special Biryani Feast - 20% OFF!', '{"type": "percentage", "value": 20}'::jsonb, 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1000&q=80', true),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'Combo Coolers: Flat ₹30 OFF', '{"type": "fixed", "value": 30}'::jsonb, 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=1000&q=80', true)
ON CONFLICT (id) DO NOTHING;

