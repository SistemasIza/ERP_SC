-- ========================================
-- DATOS INICIALES PARA DEMOSTRACIÓN
-- ========================================

-- Insertar organizaciones de demo si no existen
INSERT INTO public.organizations (id, name, plan, max_whatsapp_connections, created_at, updated_at) VALUES 
  ('1', 'Sparktree Admin', 'enterprise', 5, NOW(), NOW()),
  ('2', 'Empresa Demo S.A.', 'basic', 2, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW();

-- Insertar usuarios de demo si no existen
INSERT INTO public.users (id, organization_id, email, full_name, role, password_hash, created_at, updated_at) VALUES 
  ('1', '1', 'admin+fabpsandoval@gmail.com', 'Super Administrador', 'super_admin', 'hashed_password_placeholder', NOW(), NOW()),
  ('2', '1', 'staff+fabpsandoval@gmail.com', 'Administrador Staff', 'staff', 'hashed_password_placeholder', NOW(), NOW()),
  ('3', '2', 'empresa@demo.com', 'Empresa Demo S.A.', 'empresa', 'hashed_password_placeholder', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW();

-- Insertar conexiones WhatsApp de demo si no existen
INSERT INTO public.whatsapp_connections (
  id, 
  organization_id, 
  user_id, 
  display_name, 
  phone_number, 
  status, 
  last_connected_at, 
  created_at, 
  updated_at
) VALUES 
  ('1', '2', '3', 'Número Principal', '+5491112345678', 'connected', '2024-03-17T08:00:00Z', NOW(), NOW()),
  ('2', '2', '3', 'Número Secundario', '+5491187654321', 'disconnected', NULL, NOW(), NOW()),
  ('3', '1', '1', 'Soporte Cliente', '+5491155556666', 'connected', '2024-03-16T15:30:00Z', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW();

-- Insertar algunos flows de demo
INSERT INTO public.flows (
  id,
  organization_id,
  name,
  description,
  status,
  is_active,
  is_default,
  category,
  created_at,
  updated_at
) VALUES 
  ('1', '2', 'Bienvenida Cliente', 'Flow de bienvenida para nuevos clientes', 'active', true, true, 'onboarding', NOW(), NOW()),
  ('2', '2', 'Soporte Técnico', 'Flow para gestión de tickets de soporte', 'active', true, false, 'support', NOW(), NOW()),
  ('3', '1', 'Flow Admin', 'Flow de ejemplo para administradores', 'draft', false, false, 'other', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW();

-- Insertar asignaciones de flows
INSERT INTO public.flow_assignments (
  id,
  flow_id,
  whatsapp_connection_id,
  is_active,
  created_at
) VALUES 
  ('1', '1', '1', true, NOW()),
  ('2', '2', '1', true, NOW()),
  ('3', '3', '3', true, NOW())
ON CONFLICT (flow_id, whatsapp_connection_id) DO UPDATE SET
  is_active = true;

-- Insertar algunos contactos de demo
INSERT INTO public.contacts (
  id,
  organization_id,
  whatsapp_connection_id,
  phone_number,
  profile_name,
  bot_state,
  last_active_at,
  created_at
) VALUES 
  ('1', '2', '1', '+5491111111111', 'Juan Pérez', 'main_menu', '2024-03-17T07:30:00Z', NOW()),
  ('2', '2', '1', '+5492222222222', 'María García', 'support_flow', '2024-03-16T18:45:00Z', NOW()),
  ('3', '2', '2', '+5493333333333', 'Carlos López', 'main_menu', '2024-03-15T12:20:00Z', NOW())
ON CONFLICT (organization_id, phone_number) DO UPDATE SET
  last_active_at = EXCLUDED.last_active_at;

-- Insertar conversaciones de demo
INSERT INTO public.conversations (
  id,
  organization_id,
  whatsapp_connection_id,
  contact_id,
  status,
  last_message_at,
  created_at,
  updated_at
) VALUES 
  ('1', '2', '1', '1', 'open', '2024-03-17T07:30:00Z', NOW(), NOW()),
  ('2', '2', '1', '2', 'closed', '2024-03-16T18:45:00Z', NOW(), NOW()),
  ('3', '2', '2', '3', 'open', '2024-03-15T12:20:00Z', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW();

-- Insertar mensajes de demo
INSERT INTO public.messages (
  id,
  organization_id,
  conversation_id,
  contact_id,
  whatsapp_connection_id,
  direction,
  type,
  content,
  status,
  created_at
) VALUES 
  ('1', '2', '1', '1', '1', 'inbound', 'text', 'Hola, necesito información sobre sus servicios', 'delivered', '2024-03-17T07:30:00Z'),
  ('2', '2', '1', '1', '1', 'outbound', 'text', '¡Hola! Bienvenido a Empresa Demo S.A. ¿En qué puedo ayudarte?', 'delivered', '2024-03-17T07:30:30Z'),
  ('3', '2', '2', '2', '1', 'inbound', 'text', 'Tengo un problema técnico', 'delivered', '2024-03-16T18:45:00Z'),
  ('4', '2', '2', '2', '1', 'outbound', 'text', 'Entendido. Te transferiré con soporte técnico.', 'delivered', '2024-03-16T18:45:45Z')
ON CONFLICT (id) DO NOTHING;

-- Insertar datos de analíticas de demo
INSERT INTO public.analytics (
  organization_id,
  whatsapp_connection_id,
  date,
  messages_sent,
  messages_received,
  new_contacts,
  active_conversations,
  flow_executions,
  average_response_time,
  satisfaction_score,
  created_at
) VALUES 
  -- Datos para Empresa Demo (org_id: 2)
  ('2', '1', '2024-03-17', 45, 38, 5, 12, 28, 120, 4.2, NOW()),
  ('2', '1', '2024-03-16', 52, 41, 3, 15, 32, 95, 4.5, NOW()),
  ('2', '1', '2024-03-15', 38, 35, 7, 10, 25, 110, 4.1, NOW()),
  
  -- Datos para Admin (org_id: 1)
  ('1', '3', '2024-03-17', 120, 98, 12, 25, 67, 85, 4.7, NOW()),
  ('1', '3', '2024-03-16', 98, 87, 8, 22, 54, 92, 4.6, NOW())
ON CONFLICT (organization_id, date) DO UPDATE SET
  messages_sent = EXCLUDED.messages_sent,
  messages_received = EXCLUDED.messages_received,
  new_contacts = EXCLUDED.new_contacts,
  active_conversations = EXCLUDED.active_conversations,
  flow_executions = EXCLUDED.flow_executions,
  average_response_time = EXCLUDED.average_response_time,
  satisfaction_score = EXCLUDED.satisfaction_score;

-- ========================================
-- VERIFICACIÓN DE DATOS
-- ========================================

-- Mostrar resumen de datos insertados
SELECT 'Organizaciones:' as table_name, COUNT(*) as record_count FROM public.organizations
UNION ALL
SELECT 'Usuarios:', COUNT(*) FROM public.users
UNION ALL
SELECT 'Conexiones WhatsApp:', COUNT(*) FROM public.whatsapp_connections
UNION ALL
SELECT 'Flows:', COUNT(*) FROM public.flows
UNION ALL
SELECT 'Contactos:', COUNT(*) FROM public.contacts
UNION ALL
SELECT 'Conversaciones:', COUNT(*) FROM public.conversations
UNION ALL
SELECT 'Mensajes:', COUNT(*) FROM public.messages
UNION ALL
SELECT 'Analytics:', COUNT(*) FROM public.analytics
ORDER BY table_name;
