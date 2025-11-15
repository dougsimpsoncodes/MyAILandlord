-- Fix security warnings for function search_path
-- Run this in Supabase SQL Editor to address the security warnings

-- Fix set_updated_at function to have immutable search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger 
LANGUAGE plpgsql 
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Fix get_auth_jwt_sub function if it exists
DROP FUNCTION IF EXISTS public.get_auth_jwt_sub();

-- Optional: Create a secure version if needed
-- CREATE OR REPLACE FUNCTION public.get_auth_jwt_sub()
-- RETURNS text
-- LANGUAGE sql
-- SECURITY DEFINER
-- SET search_path = ''
-- AS $$
--   SELECT auth.jwt() ->> 'sub';
-- $$;