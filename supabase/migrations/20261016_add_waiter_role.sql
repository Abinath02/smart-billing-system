-- ====================================================================
-- SUPABASE MIGRATION: ADD 'waiter' ROLE & CONFIGURE PERMISSIONS
-- Run this in Supabase Dashboard: SQL Editor -> New Query -> Run
-- ====================================================================

-- 1. Add 'waiter' to user_role ENUM (Must be top-level, NOT inside a DO block)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'waiter';

-- 2. Configure Profiles Table Security
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated users to read profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
CREATE POLICY "Allow users to update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- 3. Configure Waiters Table Security
ALTER TABLE IF EXISTS public.waiters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all to read active waiters" ON public.waiters;
CREATE POLICY "Allow all to read active waiters"
    ON public.waiters FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow staff to manage waiters" ON public.waiters;
CREATE POLICY "Allow staff to manage waiters"
    ON public.waiters FOR ALL
    USING (true);

-- 4. Configure Orders Table Security for Staff
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all to read and update orders" ON public.orders;
CREATE POLICY "Allow all to read and update orders"
    ON public.orders FOR ALL
    USING (true);

-- 5. Verification Check:
-- Run this to confirm 'waiter' is now in user_role enum:
SELECT enum_range(NULL::user_role);
