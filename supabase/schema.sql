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
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'cashier'::public.user_role)
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Prevent trigger error from aborting auth.users signup
        RETURN NEW;
END;
$$;

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

-- Orders & Order Items: Fully permissive for QR ordering and staff operations
DROP POLICY IF EXISTS "Staff can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can insert/update orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can view their placed orders" ON public.orders;
DROP POLICY IF EXISTS "Allow select orders" ON public.orders;
DROP POLICY IF EXISTS "Allow insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow update orders" ON public.orders;
DROP POLICY IF EXISTS "Allow delete orders" ON public.orders;

CREATE POLICY "Allow select orders" ON public.orders
    FOR SELECT USING (true);

CREATE POLICY "Allow insert orders" ON public.orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update orders" ON public.orders
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete orders" ON public.orders
    FOR DELETE USING (auth.role() = 'authenticated');

-- Order Items Policies
DROP POLICY IF EXISTS "Staff can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff can insert/update order items" ON public.order_items;
DROP POLICY IF EXISTS "Customers can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Customers can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow select order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow insert order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow update order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow delete order_items" ON public.order_items;

CREATE POLICY "Allow select order_items" ON public.order_items
    FOR SELECT USING (true);

CREATE POLICY "Allow insert order_items" ON public.order_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update order_items" ON public.order_items
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete order_items" ON public.order_items
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant execute permissions for functions to anon and authenticated
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Profiles: Allow reading profiles without infinite recursion
DROP POLICY IF EXISTS "Admins can view and manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Allow read profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow update profiles" ON public.profiles
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (true);


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

-- ====================================================================
-- 11. SECURE SERVER-SIDE PRICING & RUNNING ORDER RPC FUNCTION
-- ====================================================================
CREATE OR REPLACE FUNCTION public.place_or_append_order(
    p_table_no TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT,
    p_notes TEXT,
    p_items JSONB,
    p_append_to_existing BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_bill_no TEXT;
    v_existing_order RECORD;
    v_item JSONB;
    v_item_id UUID;
    v_item_qty INT;
    v_special_notes TEXT;
    v_db_item RECORD;
    v_offer RECORD;
    v_unit_price NUMERIC(10, 2);
    v_item_discount NUMERIC(10, 2);
    v_line_total NUMERIC(10, 2);
    v_batch_subtotal NUMERIC(10, 2) := 0.00;
    v_batch_discount NUMERIC(10, 2) := 0.00;
    v_tax_rate NUMERIC(10, 4) := 0.0500; -- 5% GST
    v_new_subtotal NUMERIC(10, 2);
    v_new_discount NUMERIC(10, 2);
    v_new_tax NUMERIC(10, 2);
    v_new_total NUMERIC(10, 2);
    v_round_tag TEXT := '';
    v_result JSONB;
BEGIN
    -- 1. Validate inputs
    IF p_table_no IS NULL OR trim(p_table_no) = '' THEN
        RAISE EXCEPTION 'Table number is required.';
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one item.';
    END IF;

    -- 2. Check for active existing order if append requested
    IF p_append_to_existing THEN
        SELECT * INTO v_existing_order
        FROM public.orders
        WHERE upper(trim(table_no)) = upper(trim(p_table_no))
          AND status IN ('pending', 'cooking', 'ready')
        ORDER BY created_at DESC
        LIMIT 1;

        IF FOUND THEN
            v_order_id := v_existing_order.id;
            v_bill_no := v_existing_order.bill_no;
            v_round_tag := ' [Add-on Round]';
        END IF;
    END IF;

    -- 3. If no existing order found or append not requested, create new order record
    IF v_order_id IS NULL THEN
        INSERT INTO public.orders (
            table_no,
            customer_name,
            customer_phone,
            customer_email,
            notes,
            subtotal,
            discount_amount,
            tax_amount,
            total_amount,
            status,
            payment_mode
        )
        VALUES (
            upper(trim(p_table_no)),
            COALESCE(NULLIF(trim(p_customer_name), ''), 'Guest Customer'),
            trim(p_customer_phone),
            trim(p_customer_email),
            p_notes,
            0.00,
            0.00,
            0.00,
            0.00,
            'pending',
            'unpaid'
        )
        RETURNING id, bill_no INTO v_order_id, v_bill_no;
    END IF;

    -- 4. Securely process each item with verified DB prices
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_id := (v_item->>'item_id')::UUID;
        v_item_qty := COALESCE((v_item->>'quantity')::INT, 1);
        v_special_notes := v_item->>'special_instructions';

        IF v_item_qty <= 0 THEN
            CONTINUE;
        END IF;

        -- Fetch real dish price and availability from menu_items
        SELECT name, price, is_available INTO v_db_item
        FROM public.menu_items
        WHERE id = v_item_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Dish with ID % does not exist.', v_item_id;
        END IF;

        IF NOT v_db_item.is_available THEN
            RAISE EXCEPTION 'Dish % is currently marked unavailable.', v_db_item.name;
        END IF;

        v_unit_price := v_db_item.price;
        v_item_discount := 0.00;

        -- Check if active offer applies
        SELECT * INTO v_offer
        FROM public.offers
        WHERE item_id = v_item_id AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1;

        IF FOUND THEN
            IF (v_offer.discount_details->>'type') = 'percentage' THEN
                v_item_discount := ROUND((v_unit_price * ((v_offer.discount_details->>'value')::NUMERIC / 100.0)), 2);
            ELSIF (v_offer.discount_details->>'type') = 'fixed' THEN
                v_item_discount := LEAST(v_unit_price, (v_offer.discount_details->>'value')::NUMERIC);
            END IF;
        END IF;

        v_line_total := (v_unit_price - v_item_discount) * v_item_qty;
        v_batch_subtotal := v_batch_subtotal + (v_unit_price * v_item_qty);
        v_batch_discount := v_batch_discount + (v_item_discount * v_item_qty);

        -- Insert order item
        INSERT INTO public.order_items (
            order_id,
            item_id,
            item_name,
            quantity,
            unit_price,
            total_price,
            special_instructions
        )
        VALUES (
            v_order_id,
            v_item_id,
            v_db_item.name,
            v_item_qty,
            v_unit_price,
            v_line_total,
            CASE 
                WHEN v_special_notes IS NOT NULL AND v_special_notes <> '' 
                THEN v_special_notes || v_round_tag
                ELSE NULLIF(v_round_tag, '')
            END
        );
    END LOOP;

    -- 5. Recalculate full order totals
    IF v_existing_order.id IS NOT NULL THEN
        v_new_subtotal := v_existing_order.subtotal + v_batch_subtotal;
        v_new_discount := v_existing_order.discount_amount + v_batch_discount;
        v_new_tax := ROUND((v_new_subtotal - v_new_discount) * v_tax_rate, 2);
        v_new_total := (v_new_subtotal - v_new_discount) + v_new_tax;

        UPDATE public.orders
        SET subtotal = v_new_subtotal,
            discount_amount = v_new_discount,
            tax_amount = v_new_tax,
            total_amount = v_new_total,
            status = 'pending', -- reset to pending so kitchen alerts for new items
            updated_at = timezone('utc', now())
        WHERE id = v_order_id;
    ELSE
        v_new_subtotal := v_batch_subtotal;
        v_new_discount := v_batch_discount;
        v_new_tax := ROUND((v_new_subtotal - v_new_discount) * v_tax_rate, 2);
        v_new_total := (v_new_subtotal - v_new_discount) + v_new_tax;

        UPDATE public.orders
        SET subtotal = v_new_subtotal,
            discount_amount = v_new_discount,
            tax_amount = v_new_tax,
            total_amount = v_new_total,
            updated_at = timezone('utc', now())
        WHERE id = v_order_id;
    END IF;

    -- 6. Fetch complete JSON response
    SELECT jsonb_build_object(
        'order', row_to_json(o),
        'items', (SELECT jsonb_agg(row_to_json(oi)) FROM public.order_items oi WHERE oi.order_id = v_order_id),
        'is_appended', (v_existing_order.id IS NOT NULL)
    ) INTO v_result
    FROM public.orders o
    WHERE o.id = v_order_id;

    RETURN v_result;
END;
$$;

-- ====================================================================
-- 12. INVENTORY & RAW MATERIALS (STORE MANAGEMENT)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General', -- e.g. 'Grains & Staples', 'Bakery', 'Seasoning', 'Meat & Poultry', 'Dairy', 'Oils'
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (quantity >= 0),
    unit TEXT NOT NULL DEFAULT 'kg', -- 'kg', 'pcs', 'liters', 'packets', 'grams'
    min_threshold NUMERIC(10, 2) NOT NULL DEFAULT 5.00 CHECK (min_threshold >= 0),
    cost_per_unit NUMERIC(10, 2) DEFAULT 0.00 CHECK (cost_per_unit >= 0),
    last_restocked_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('used', 'restocked', 'adjusted')),
    quantity NUMERIC(10, 2) NOT NULL,
    previous_quantity NUMERIC(10, 2) NOT NULL,
    new_quantity NUMERIC(10, 2) NOT NULL,
    staff_name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON public.inventory_items(name);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_item_id ON public.inventory_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON public.inventory_logs(created_at DESC);

-- Updated_at Trigger
CREATE OR REPLACE TRIGGER trg_inventory_items_updated_at
    BEFORE UPDATE ON public.inventory_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can view inventory" ON public.inventory_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated staff can update inventory" ON public.inventory_items
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated staff can insert inventory items" ON public.inventory_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete inventory items" ON public.inventory_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Authenticated staff can view inventory logs" ON public.inventory_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated staff can insert inventory logs" ON public.inventory_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Realtime Publication for live inventory counters
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;

-- Seed Raw Materials / Ingredients
INSERT INTO public.inventory_items (name, category, quantity, unit, min_threshold, cost_per_unit) VALUES
('Basmati Rice', 'Grains & Staples', 35.00, 'kg', 10.00, 95.00),
('Burger Buns', 'Bakery', 60.00, 'pcs', 20.00, 8.00),
('Cooking Salt', 'Seasoning', 15.00, 'kg', 5.00, 22.00),
('Sunflower Cooking Oil', 'Oils', 25.00, 'liters', 8.00, 140.00),
('Fresh Chicken', 'Meat & Poultry', 30.00, 'kg', 10.00, 220.00),
('Wheat Flour (Atta)', 'Grains & Staples', 25.00, 'kg', 6.00, 48.00),
('All-Purpose Flour (Maida)', 'Grains & Staples', 20.00, 'kg', 5.00, 45.00),
('Refined White Sugar', 'Grains & Staples', 18.00, 'kg', 5.00, 42.00),
('Fresh Milk', 'Dairy', 15.00, 'liters', 5.00, 56.00),
('Butter & Ghee', 'Dairy', 8.00, 'kg', 3.00, 580.00),
('Biryani Garam Masala', 'Seasoning', 5.00, 'kg', 2.00, 650.00),
('Paneer (Cottage Cheese)', 'Dairy', 12.00, 'kg', 4.00, 360.00)
ON CONFLICT DO NOTHING;


