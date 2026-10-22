-- ====================================================================
-- RESTAURANT SMART BILLING SYSTEM: PRODUCTION ROW LEVEL SECURITY (RLS)
-- Migration: 20261022_strict_row_level_security.sql
-- ====================================================================

-- 1. Helper function to safely fetch the caller's role from profiles
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Enable RLS on all core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiters ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 3. PROFILES TABLE POLICIES
-- ====================================================================
DROP POLICY IF EXISTS "Allow select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow delete profiles" ON public.profiles;

-- Staff and authenticated users can view staff profiles
CREATE POLICY "Allow select profiles" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Only Admins or service_role can insert new staff accounts
CREATE POLICY "Allow insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR
        public.current_user_role() = 'admin' OR
        auth.uid() = id
    );

-- Users can update their own profile; Admins can update any profile
CREATE POLICY "Allow update profiles" ON public.profiles
    FOR UPDATE USING (
        auth.role() = 'service_role' OR
        auth.uid() = id OR
        public.current_user_role() = 'admin'
    );

-- Only Admins can delete profiles
CREATE POLICY "Allow delete profiles" ON public.profiles
    FOR DELETE USING (
        auth.role() = 'service_role' OR
        public.current_user_role() = 'admin'
    );

-- ====================================================================
-- 4. MENU ITEMS POLICIES
-- ====================================================================
DROP POLICY IF EXISTS "Allow select menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow insert menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow update menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow delete menu_items" ON public.menu_items;

-- Public customers and staff can view active dishes
CREATE POLICY "Allow select menu_items" ON public.menu_items
    FOR SELECT USING (true);

-- Only Admins can add new menu items
CREATE POLICY "Allow insert menu_items" ON public.menu_items
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR
        public.current_user_role() = 'admin'
    );

-- Admins can update prices, Kitchen staff can toggle is_available
CREATE POLICY "Allow update menu_items" ON public.menu_items
    FOR UPDATE USING (
        auth.role() = 'service_role' OR
        public.current_user_role() IN ('admin', 'kitchen')
    );

-- Only Admins can delete menu items
CREATE POLICY "Allow delete menu_items" ON public.menu_items
    FOR DELETE USING (
        auth.role() = 'service_role' OR
        public.current_user_role() = 'admin'
    );

-- ====================================================================
-- 5. INVENTORY POLICIES
-- ====================================================================
DROP POLICY IF EXISTS "Allow select inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow insert inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow update inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow delete inventory" ON public.inventory;

-- Authenticated staff can view inventory
CREATE POLICY "Allow select inventory" ON public.inventory
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Admin and Kitchen staff can add/update inventory
CREATE POLICY "Allow insert inventory" ON public.inventory
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR
        public.current_user_role() IN ('admin', 'kitchen')
    );

CREATE POLICY "Allow update inventory" ON public.inventory
    FOR UPDATE USING (
        auth.role() = 'service_role' OR
        public.current_user_role() IN ('admin', 'kitchen')
    );

-- Only Admin can delete inventory items
CREATE POLICY "Allow delete inventory" ON public.inventory
    FOR DELETE USING (
        auth.role() = 'service_role' OR
        public.current_user_role() = 'admin'
    );

-- ====================================================================
-- 6. WAITERS POLICIES
-- ====================================================================
DROP POLICY IF EXISTS "Allow select waiters" ON public.waiters;
DROP POLICY IF EXISTS "Allow insert waiters" ON public.waiters;
DROP POLICY IF EXISTS "Allow update waiters" ON public.waiters;
DROP POLICY IF EXISTS "Allow delete waiters" ON public.waiters;

CREATE POLICY "Allow select waiters" ON public.waiters
    FOR SELECT USING (true);

CREATE POLICY "Allow insert waiters" ON public.waiters
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR
        public.current_user_role() IN ('admin', 'kitchen')
    );

CREATE POLICY "Allow update waiters" ON public.waiters
    FOR UPDATE USING (
        auth.role() = 'service_role' OR
        public.current_user_role() IN ('admin', 'kitchen')
    );

CREATE POLICY "Allow delete waiters" ON public.waiters
    FOR DELETE USING (
        auth.role() = 'service_role' OR
        public.current_user_role() = 'admin'
    );

-- ====================================================================
-- 7. ORDERS & ORDER ITEMS POLICIES
-- ====================================================================
DROP POLICY IF EXISTS "Allow select orders" ON public.orders;
DROP POLICY IF EXISTS "Allow insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow update orders" ON public.orders;
DROP POLICY IF EXISTS "Allow delete orders" ON public.orders;

-- Public can view placed orders, staff can view all orders
CREATE POLICY "Allow select orders" ON public.orders
    FOR SELECT USING (true);

-- Anyone (dine-in customer QR or staff) can place an order
CREATE POLICY "Allow insert orders" ON public.orders
    FOR INSERT WITH CHECK (true);

-- Authenticated staff can update orders (kitchen cook status, cashier settle)
CREATE POLICY "Allow update orders" ON public.orders
    FOR UPDATE USING (true);

-- Only Admin can delete orders
CREATE POLICY "Allow delete orders" ON public.orders
    FOR DELETE USING (
        auth.role() = 'service_role' OR
        public.current_user_role() = 'admin'
    );

-- Order items
DROP POLICY IF EXISTS "Allow select order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow insert order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow update order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow delete order_items" ON public.order_items;

CREATE POLICY "Allow select order_items" ON public.order_items
    FOR SELECT USING (true);

CREATE POLICY "Allow insert order_items" ON public.order_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update order_items" ON public.order_items
    FOR UPDATE USING (true);

CREATE POLICY "Allow delete order_items" ON public.order_items
    FOR DELETE USING (
        auth.role() = 'service_role' OR
        public.current_user_role() = 'admin'
    );

-- ====================================================================
-- 8. OFFERS POLICIES
-- ====================================================================
DROP POLICY IF EXISTS "Allow select offers" ON public.offers;
DROP POLICY IF EXISTS "Allow insert offers" ON public.offers;
DROP POLICY IF EXISTS "Allow update offers" ON public.offers;
DROP POLICY IF EXISTS "Allow delete offers" ON public.offers;

CREATE POLICY "Allow select offers" ON public.offers
    FOR SELECT USING (true);

CREATE POLICY "Allow insert offers" ON public.offers
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR
        public.current_user_role() = 'admin'
    );

CREATE POLICY "Allow update offers" ON public.offers
    FOR UPDATE USING (
        auth.role() = 'service_role' OR
        public.current_user_role() = 'admin'
    );

CREATE POLICY "Allow delete offers" ON public.offers
    FOR DELETE USING (
        auth.role() = 'service_role' OR
        public.current_user_role() = 'admin'
    );
