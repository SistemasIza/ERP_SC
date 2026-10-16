-- Tracking de entrega (webhooks de Meta) para los contactos de recordatorios.
-- Guarda el wamid devuelto por Cloud API y las fechas reales de delivered/read.
-- El status se mantiene (pending/sent/failed/skipped) para no romper los contadores;
-- 'failed' del webhook sí actualiza status.

ALTER TABLE public.reminder_contacts
  ADD COLUMN IF NOT EXISTS whatsapp_message_id text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

COMMENT ON COLUMN public.reminder_contacts.whatsapp_message_id IS 'wamid devuelto por Meta Cloud API; permite cruzar los status webhooks (delivered/read/failed)';
COMMENT ON COLUMN public.reminder_contacts.delivered_at IS 'Momento en que Meta reportó el estado delivered';
COMMENT ON COLUMN public.reminder_contacts.read_at IS 'Momento en que Meta reportó el estado read';

CREATE INDEX IF NOT EXISTS idx_reminder_contacts_wamid
  ON public.reminder_contacts(whatsapp_message_id);
