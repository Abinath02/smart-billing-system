-- ====================================================================
-- SUPABASE MIGRATION: ADD 'waiter' ROLE & STAFF PERMISSIONS
-- Execute this script in your Supabase SQL Editor:
-- Dashboard > SQL Editor > New query > Paste & Run
-- ====================================================================

-- 1. Add 'waiter' to the user_role ENUM type
DO $$ 
BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'waiter';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Ensure RLS policies on profiles table allow staff reading and self-management
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Allow authenticated users to view profiles (needed for role check at login)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow authenticated users to read profiles'
    ) THEN
        CREATE POLICY "Allow authenticated users to read profiles"
            ON public.profiles FOR SELECT
            TO authenticated
            USING (true);
    END IF;

    -- Allow users to update their own profile
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow users to update own profile'
    ) THEN
        CREATE POLICY "Allow users to update own profile"
            ON public.profiles FOR UPDATE
            TO authenticated
            USING (auth.uid() = id);
    END IF;
END $$;

-- 3. Ensure waiters table has proper RLS policies
ALTER TABLE IF EXISTS public.waiters ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Allow public and authenticated staff to read active waiters
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'waiters' AND policyname = 'Allow all to read active waiters'
    ) THEN
        CREATE POLICY "Allow all to read active waiters"
            ON public.waiters FOR SELECT
            USING (true);
    END IF;

    -- Allow staff and service role to insert or update waiters
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'waiters' AND policyname = 'Allow staff to manage waiters'
    ) THEN
        CREATE POLICY "Allow staff to manage waiters"
            ON public.waiters FOR ALL
            USING (true);
    END IF;
END $$;

-- 4. Ensure orders table allows waiters to update status and waiter_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Allow all to read and update orders'
    ) THEN
        CREATE POLICY "Allow all to read and update orders"
            ON public.orders FOR ALL
            USING (true);
    END IF;
END $$;

-- Verification check query:
-- SELECT enum_range(NULL::user_role);
