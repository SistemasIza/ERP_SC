-- ============================================================
-- MIGRACIÓN: Agregar columna image_base64 a reminders
-- Ejecutar solo si la tabla reminders ya existe
-- ============================================================

-- Agregar columna image_base64 (nullable, para mensajes con imagen)
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS image_base64 text;

-- Cambiar default de delay_ms a 6000 (6 segundos)
ALTER TABLE public.reminders ALTER COLUMN delay_ms SET DEFAULT 6000;

-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================
