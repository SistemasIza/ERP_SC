-- Agrega campos para templates de Meta Cloud API a reminders y campaigns
-- Necesario para enviar recordatorios/campañas via Cloud API (requiere template aprobado por Meta)

ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS meta_template_name varchar(255),
  ADD COLUMN IF NOT EXISTS meta_template_language varchar(10) DEFAULT 'es';

COMMENT ON COLUMN public.reminders.meta_template_name IS 'Nombre del template aprobado por Meta para envíos via Cloud API (obligatorio si la conexión es Cloud API)';
COMMENT ON COLUMN public.reminders.meta_template_language IS 'Código de idioma del template Meta (default: es)';

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS meta_template_name varchar(255),
  ADD COLUMN IF NOT EXISTS meta_template_language varchar(10) DEFAULT 'es';

COMMENT ON COLUMN public.campaigns.meta_template_name IS 'Nombre del template aprobado por Meta para envíos via Cloud API (obligatorio si la conexión es Cloud API)';
COMMENT ON COLUMN public.campaigns.meta_template_language IS 'Código de idioma del template Meta (default: es)';
