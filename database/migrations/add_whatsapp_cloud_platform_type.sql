-- Migration: Add 'whatsapp_cloud' to conversations and messages platform_type CHECK constraints
-- This allows Cloud API conversations to be properly distinguished from QR/Baileys conversations

-- Conversations table
ALTER TABLE public.conversations
DROP CONSTRAINT IF EXISTS conversations_platform_type_check;

ALTER TABLE public.conversations
ADD CONSTRAINT conversations_platform_type_check 
CHECK (platform_type IN ('whatsapp', 'whatsapp_cloud', 'telegram', 'instagram', 'facebook_messenger', 'tiktok', 'mercadolibre'));

-- Messages table
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_platform_type_check;

ALTER TABLE public.messages
ADD CONSTRAINT messages_platform_type_check 
CHECK (platform_type IN ('whatsapp', 'whatsapp_cloud', 'telegram', 'instagram', 'facebook_messenger', 'tiktok', 'mercadolibre'));
