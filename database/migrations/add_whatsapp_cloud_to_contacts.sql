-- Migration: Add 'whatsapp_cloud' to contacts.platform_type CHECK constraint
-- The contacts table was created with an older schema that didn't include 'whatsapp_cloud'

-- contacts table
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_platform_type_check;
ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_platform_type_check
  CHECK (platform_type IN ('whatsapp', 'whatsapp_cloud', 'telegram', 'instagram', 'facebook_messenger', 'tiktok', 'mercadolibre'));
