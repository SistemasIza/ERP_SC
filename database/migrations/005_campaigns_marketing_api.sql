-- MM API for WhatsApp: indicar si una campaña envía via /marketing_messages (marketing optimizado)
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS use_marketing_api boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.campaigns.use_marketing_api IS 'Enviar via MM API for WhatsApp (endpoint /marketing_messages) en lugar de Cloud API normal';
