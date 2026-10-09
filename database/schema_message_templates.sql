-- ============================================================
-- SPARKTREE SAAS - ESQUEMA DE PLANTILLAS DE MENSAJES
-- Plantillas reutilizables para campañas, recordatorios, etc.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  category varchar(100) NOT NULL DEFAULT 'general'
    CHECK (category IN ('general', 'ventas', 'soporte', 'marketing', 'recordatorio', 'cobranza', 'otro')),
  content text NOT NULL,
  variables text[] NOT NULL DEFAULT '{}',
  usage_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_organization_id
  ON public.message_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_category
  ON public.message_templates(category);

-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================
