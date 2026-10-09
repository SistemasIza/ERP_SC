# 📊 Base de Datos - Sparktree SAAS

## 📋 Estructura General

Este proyecto implementa una arquitectura **multitenant** que permite a múltiples organizaciones gestionar sus propios chatbots de WhatsApp de forma independiente y segura.

## 🏗️ Esquema Principal

### 1. **Organizaciones** (`organizations`)
- Entidad principal del sistema multitenant
- Almacena información de cada empresa/cliente
- Configura límites de conexiones WhatsApp

### 2. **Usuarios** (`users`)
- Gestión de usuarios por organización
- Roles jerárquicos: `super_admin`, `admin`, `staff`, `empresa`, `agent`
- Cada usuario pertenece a una sola organización

### 3. **Conexiones WhatsApp** (`whatsapp_connections`)
- **Máximo 2 conexiones por organización** (configurable)
- Estados: `connected`, `disconnected`, `connecting`
- Vinculado a organización y usuario específico

### 4. **Contactos** (`contacts`)
- Clientes que interactúan con los chatbots
- **Aislados por organización y conexión WhatsApp**
- Estado actual del bot para cada contacto

### 5. **Conversaciones** (`conversations`)
- Historial completo de conversaciones
- Vinculadas a contactos y organizaciones
- Estados: `open`, `closed`, `archived`

### 6. **Mensajes** (`messages`)
- Cada mensaje individual enviado/recibido
- **Total aislamiento de datos por organización**
- Soporte para múltiples tipos de contenido

### 7. **Flows** (`flows`)
- Chatbots personalizados por organización
- Editor visual con nodos y conexiones
- Categorías: `sales`, `support`, `marketing`, `onboarding`, `other`

### 8. **Analíticas** (`analytics`)
- Métricas de uso por organización y conexión
- Datos agregados por fecha
- KPIs: mensajes, contactos, satisfacción, etc.

## 🔐 Seguridad y Aislamiento

### ✅ **Multitenant Seguro**
- **Cada tabla tiene `organization_id`**
- **Foreign keys con `ON DELETE CASCADE`**
- **Constraints UNIQUE para evitar duplicados**

### ✅ **Límites por Organización**
- **Máximo 2 conexiones WhatsApp** (configurable en `organizations.max_whatsapp_connections`)
- Validación a nivel de base de datos
- Control visual en el frontend

### ✅ **Integridad Referencial**
- Todas las relaciones están properly indexed
- Eliminación en cascada para mantener consistencia
- Constraints CHECK para validar estados

## 📈 Índices de Rendimiento

### Índices Principales
```sql
-- Búsquedas por organización (más importantes)
idx_users_organization_id
idx_whatsapp_connections_org_id
idx_contacts_org_id
idx_conversations_org_id
idx_messages_org_id
idx_flows_org_id
idx_analytics_org_id

-- Búsquedas específicas
idx_whatsapp_connections_status
idx_contacts_phone
idx_messages_created_at
idx_conversations_last_message
idx_analytics_date
```

## 🚀 Instalación

### 1. **Requisitos Previos**
```bash
# PostgreSQL 13+
# Extensión uuid-ossp
```

### 2. **Crear Base de Datos**
```bash
createdb sparktree_saas
```

### 3. **Ejecutar Schema**
```bash
psql -U your_user -d sparktree_saas -f database/schema.sql
```

### 4. **Cargar Datos de Demo**
```bash
psql -U your_user -d sparktree_saas -f database/seed_data.sql
```

## 📊 Datos de Demo

### Organizaciones
- **ID 1:** Sparktree Admin (Enterprise, 5 conexiones)
- **ID 2:** Empresa Demo S.A. (Basic, 2 conexiones)

### Usuarios
- **admin+fabpsandoval@gmail.com:** Super Administrador
- **staff+fabpsandoval@gmail.com:** Administrador Staff  
- **empresa@demo.com:** Usuario Empresa

### Conexiones WhatsApp
- **Empresa Demo:** 2 números (+5491112345678, +5491187654321)
- **Admin:** 1 número (+5491155556666)

## 🔍 Consultas Útiles

### Ver conexiones por organización
```sql
SELECT 
  o.name as organization,
  COUNT(wc.id) as connections_count,
  o.max_whatsapp_connections,
  ARRAY_AGG(wc.display_name) as connection_names
FROM organizations o
LEFT JOIN whatsapp_connections wc ON o.id = wc.organization_id
GROUP BY o.id, o.name, o.max_whatsapp_connections;
```

### Métricas por organización
```sql
SELECT 
  o.name,
  SUM(a.messages_sent) as total_sent,
  SUM(a.messages_received) as total_received,
  SUM(a.new_contacts) as total_new_contacts,
  AVG(a.satisfaction_score) as avg_satisfaction
FROM organizations o
LEFT JOIN analytics a ON o.id = a.organization_id
WHERE a.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY o.id, o.name;
```

### Conversaciones activas por conexión
```sql
SELECT 
  wc.display_name,
  wc.phone_number,
  wc.status,
  COUNT(c.id) as active_conversations
FROM whatsapp_connections wc
LEFT JOIN conversations c ON wc.id = c.whatsapp_connection_id AND c.status = 'open'
WHERE wc.organization_id = '2' -- Empresa Demo
GROUP BY wc.id, wc.display_name, wc.phone_number, wc.status;
```

## 🔄 Mantenimiento

### Backup Diario
```bash
pg_dump -U your_user sparktree_saas > backup_$(date +%Y%m%d).sql
```

### Limpiar Datos Antiguos (Opcional)
```sql
-- Eliminar mensajes de más de 1 año
DELETE FROM messages 
WHERE created_at < NOW() - INTERVAL '1 year';

-- Eliminar analíticas de más de 2 años
DELETE FROM analytics 
WHERE date < CURRENT_DATE - INTERVAL '2 years';
```

## 📝 Notas Importantes

1. **Escalabilidad:** El esquema está diseñado para escalar a miles de organizaciones
2. **Rendimiento:** Los índices están optimizados para consultas multitenant
3. **Seguridad:** Total aislamiento de datos entre organizaciones
4. **Flexibilidad:** Configurable para diferentes planes y límites
5. **Auditoría:** Todos los cambios tienen timestamp y tracking

## 🚨 Consideraciones de Producción

1. **Connection Pooling:** Configurar PgBouncer o similar
2. **Replicación:** Considerar read replicas para analíticas
3. **Backups:** Automatizar backups diarios y retention policies
4. **Monitoring:** Monitorear performance de consultas lentas
5. **Security:** Row Level Security (RLS) para mayor seguridad
