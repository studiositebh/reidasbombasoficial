-- Add new values to the app_role enum
-- We cannot directly add values to an existing enum in a simple way,
-- so we need to use ALTER TYPE ... ADD VALUE

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'collaborator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';