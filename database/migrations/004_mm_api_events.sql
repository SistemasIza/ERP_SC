-- MM API for WhatsApp: registro de eventos de onboarding (account_update webhooks)
CREATE TABLE IF NOT EXISTS public.platform_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL DEFAULT 'whatsapp',
  event_type text NOT NULL,
  event_name text,
  waba_id text,
  owner_business_id text,
  ad_account_id text,
  raw_payload jsonb,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_webhook_events_received
  ON public.platform_webhook_events (received_at DESC);
