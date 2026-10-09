-- ============================================================
-- SPARKTREE SAAS - ESQUEMA DE RECORDATORIOS
-- Módulo para envío de mensajes automatizados a contactos
-- ============================================================

-- 1. Tabla principal de recordatorios
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  message_template text NOT NULL,
  whatsapp_connection_id uuid,
  status varchar(50) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'paused', 'completed', 'cancelled', 'failed')),
  schedule_type varchar(50) NOT NULL DEFAULT 'now'
    CHECK (schedule_type IN ('now', 'once', 'recurring')),
  scheduled_at timestamptz,
  recurring_cron varchar(100),
  recurring_timezone varchar(100) DEFAULT 'America/Lima',
  delay_ms integer DEFAULT 6000,
  total integer DEFAULT 0,
  sent integer DEFAULT 0,
  failed integer DEFAULT 0,
  last_sent_at timestamptz,
  next_run_at timestamptz,
  image_base64 text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_organization_id
  ON public.reminders(organization_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status
  ON public.reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_next_run
  ON public.reminders(next_run_at) WHERE status = 'scheduled';

-- 2. Contactos del recordatorio (base de datos aparte importada desde Excel)
CREATE TABLE IF NOT EXISTS public.reminder_contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reminder_id uuid NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
  phone varchar(50) NOT NULL,
  variables jsonb DEFAULT '{}',
  status varchar(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminder_contacts_reminder_id
  ON public.reminder_contacts(reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_contacts_status
  ON public.reminder_contacts(status);

-- 3. Historial de envíos (cada ejecución del recordatorio)
CREATE TABLE IF NOT EXISTS public.reminder_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reminder_id uuid NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
  total_sent integer DEFAULT 0,
  total_failed integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_reminder_id
  ON public.reminder_logs(reminder_id);

-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================
