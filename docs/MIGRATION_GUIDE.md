# Guía de Migración - Arquitectura V2

Esta guía proporciona instrucciones paso a paso para migrar el código existente de Sparktree CRM a la nueva arquitectura basada en DDD y monorepo.

## Resumen de Cambios

### De Arquitectura Actual → Nueva Arquitectura

**Estructura Actual:**
```
apps/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── integrations/
│   │   │   ├── bots/
│   │   │   ├── system/
│   │   │   └── ai/
│   │   ├── core/
│   │   ├── webhooks/
│   │   └── knowledge/
└── frontend/
    └── src/
        ├── pages/
        ├── components/
        └── ...
```

**Nueva Estructura:**
```
apps/
├── backend/
│   └── src/
│       ├── modules/ (DDD-based)
│       │   ├── auth/
│       │   ├── companies/
│       │   ├── users/
│       │   ├── contacts/
│       │   ├── leads/
│       │   ├── pipeline/
│       │   ├── inbox/
│       │   ├── integrations/
│       │   └── ...
│       ├── shared/
│       │   ├── infrastructure/
│       │   ├── middleware/
│       │   └── ...
│       └── core/
└── frontend/
    └── src/
        ├── modules/ (feature-based)
        │   ├── auth/
        │   ├── dashboard/
        │   ├── contacts/
        │   ├── leads/
        │   ├── pipeline/
        │   ├── inbox/
        │   └── ...
        └── shared/
```

## Fase 1: Preparación

### 1.1 Backup del Código Existente

```bash
# Crear rama de backup
git checkout -b backup/pre-migration
git add .
git commit -m "Backup before migration to V2 architecture"
git push origin backup/pre-migration

# Crear rama de migración
git checkout main
git checkout -b feature/migration-to-v2
```

### 1.2 Instalar Dependencias del Monorepo

```bash
# Instalar Turborepo globalmente
npm install -g turbo

# Instalar dependencias del monorepo
npm install
```

### 1.3 Configurar Variables de Entorno

```bash
# Copiar archivos de ejemplo
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# Editar con tus valores reales
# Asegúrate de configurar DATABASE_URL, JWT_SECRET, etc.
```

## Fase 2: Migración de Base de Datos

### 2.1 Ejecutar Migraciones de Master DB

```bash
# Crear base de datos maestra
createdb sparktree_master

# Ejecutar migraciones
npm run db:migrate:master
```

### 2.2 Migrar Datos Existentes

```sql
-- Script para migrar organizaciones existentes a companies
INSERT INTO companies (id, name, slug, status, created_at, updated_at)
SELECT 
  id,
  name,
  LOWER(REPLACE(name, ' ', '-')) as slug,
  'active' as status,
  created_at,
  updated_at
FROM organizations;

-- Script para migrar usuarios existentes
INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, created_at, updated_at)
SELECT 
  u.id,
  u.organization_id as company_id,
  u.email,
  u.password_hash,
  u.first_name,
  u.last_name,
  u.created_at,
  u.updated_at
FROM users u;

-- Script para migrar contactos existentes (para cada tenant)
-- Este script debe ejecutarse para cada base de datos de tenant
```

### 2.3 Crear Bases de Datos de Tenants

```bash
# Para cada empresa existente, crear base de datos de tenant
npm run db:create:tenant <company-id> <company-name>

# Ejemplo:
npm run db:create:tenant 123e4567-e89b-12d3-a456-426614174000 "Mi Empresa"
```

## Fase 3: Migración del Backend

### 3.1 Migrar Módulo de Autenticación

**Archivo Actual:** `apps/backend/src/modules/auth/`
**Nueva Ubicación:** `apps/backend/src/modules/auth/`

**Cambios requeridos:**
1. Mover archivos a la nueva estructura de carpetas
2. Reorganizar en subcarpetas: controllers, services, repositories, entities, dto, validators
3. Actualizar imports para usar la nueva estructura
4. Implementar middleware multi-tenant

**Ejemplo de migración:**
```typescript
// Antes: apps/backend/src/modules/auth/auth.service.ts
// Después: apps/backend/src/modules/auth/services/auth.service.ts

// Actualizar imports
import { UserRepository } from '../repositories/user.repository';
import { UserEntity } from '../entities/user.entity';
```

### 3.2 Migrar Módulo de Integraciones

**Archivo Actual:** `apps/backend/src/modules/integrations/`
**Nueva Ubicación:** `apps/backend/src/modules/integrations/`

**Cambios requeridos:**
1. Reorganizar en estructura DDD
2. Mover servicios de plataforma a `platforms/` subcarpeta
3. Implementar interfaz base `IPlatformService`
4. Actualizar para soportar configuración flexible (Cloud API vs QR)

**Ejemplo de migración de WhatsApp:**
```typescript
// Antes: apps/backend/src/modules/integrations/multiWhatsAppService.ts
// Después: apps/backend/src/modules/integrations/platforms/whatsapp/whatsapp.service.ts

// Implementar interfaz base
export class WhatsAppService implements IPlatformService {
  // Implementar métodos de interfaz
  async configure(config: WhatsAppConfig): Promise<void> { }
  async handleWebhook(data: any): Promise<PlatformMessage> { }
  // ...
}
```

### 3.3 Migrar Módulo de Knowledge Retrieval

**Archivo Actual:** `apps/backend/src/knowledge/`
**Nueva Ubicación:** `apps/backend/src/modules/knowledge/`

**Cambios requeridos:**
1. Mover a estructura de módulos DDD
2. Reorganizar en subcarpetas apropiadas
3. Actualizar para usar conexión de base de datos del tenant

### 3.4 Migrar Módulo de Bots/Flow Engine

**Archivo Actual:** `apps/backend/src/modules/bots/`
**Nueva Ubicación:** `apps/backend/src/modules/automation/`

**Cambios requeridos:**
1. Renombrar a `automation` para mejor claridad
2. Reorganizar en estructura DDD
3. Integrar con nuevo sistema de knowledge retrieval
4. Actualizar para usar middleware multi-tenant

### 3.5 Migrar Webhooks

**Archivo Actual:** `apps/backend/src/webhooks/`
**Nueva Ubicación:** `apps/backend/src/modules/integrations/webhooks/`

**Cambios requeridos:**
1. Mover dentro del módulo de integraciones
2. Reorganizar en estructura DDD
3. Actualizar para usar nueva arquitectura de plataformas

### 3.6 Implementar Middleware Multi-Tenant

**Nuevo archivo:** `apps/backend/src/shared/middleware/tenant.middleware.ts`

**Integración:**
```typescript
// apps/backend/src/api/app.ts
import { tenantMiddleware } from '../shared/middleware/tenant.middleware';

app.use(tenantMiddleware);
```

## Fase 4: Migración del Frontend

### 4.1 Migrar Páginas a Módulos de Negocio

**Estrategia de migración:**
1. Identificar cada página actual
2. Asignar al módulo de negocio correspondiente
3. Mover a la nueva estructura de carpetas
4. Actualizar imports y rutas

**Mapeo de páginas:**
```
pages/Analytics.tsx → modules/analytics/pages/Analytics.tsx
pages/Pipeline.tsx → modules/pipeline/pages/PipelineView.tsx
pages/Contacts.tsx → modules/contacts/pages/ContactsList.tsx
pages/Leads.tsx → modules/leads/pages/LeadsList.tsx
pages/Inbox.tsx → modules/inbox/pages/InboxList.tsx
```

### 4.2 Migrar Componentes Compartidos

**Archivo Actual:** `apps/frontend/src/components/`
**Nueva Ubicación:** `apps/frontend/src/shared/components/`

**Cambios requeridos:**
1. Mover componentes compartidos a `shared/components/`
2. Organizar en subcarpetas: layout, ui, feedback
3. Actualizar imports en todos los módulos

### 4.3 Migrar Hooks Personalizados

**Archivo Actual:** `apps/frontend/src/hooks/`
**Nueva Ubicación:** `apps/frontend/src/shared/hooks/`

**Cambios requeridos:**
1. Mover hooks compartidos a `shared/hooks/`
2. Mover hooks específicos de módulos a cada módulo
3. Actualizar imports

### 4.4 Migrar Servicios API

**Archivo Actual:** `apps/frontend/src/services/`
**Nueva Ubicación:** `apps/frontend/src/modules/*/services/`

**Cambios requeridos:**
1. Mover servicios específicos de módulos a cada módulo
2. Crear servicios compartidos en `packages/shared/src/`
3. Actualizar para usar nueva estructura de API

### 4.5 Actualizar Configuración de Rutas

**Archivo Actual:** `apps/frontend/src/App.tsx` o similar
**Nueva Ubicación:** `apps/frontend/src/config/routes.tsx`

**Ejemplo:**
```typescript
// apps/frontend/src/config/routes.tsx
import { lazy } from 'react';

export const routes = [
  {
    path: '/auth/login',
    component: lazy(() => import('../modules/auth/pages/Login')),
  },
  {
    path: '/dashboard',
    component: lazy(() => import('../modules/dashboard/pages/Dashboard')),
  },
  {
    path: '/contacts',
    component: lazy(() => import('../modules/contacts/pages/ContactsList')),
  },
  // ...
];
```

## Fase 5: Actualización de Configuración

### 5.1 Actualizar package.json del Backend

```json
{
  "name": "@sparktree/backend",
  "scripts": {
    "dev": "ts-node-dev --respawn src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.11.0",
    // ... otras dependencias
  }
}
```

### 5.2 Actualizar package.json del Frontend

```json
{
  "name": "@sparktree/frontend",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-router-dom": "^6.0.0",
    // ... otras dependencias
  }
}
```

### 5.3 Actualizar Configuración de TypeScript

**Backend:** `apps/backend/tsconfig.json`
```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./src",
    "paths": {
      "@modules/*": ["modules/*"],
      "@shared/*": ["shared/*"],
      "@core/*": ["core/*"]
    }
  }
}
```

**Frontend:** `apps/frontend/tsconfig.json`
```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@modules/*": ["modules/*"],
      "@shared/*": ["shared/*"]
    }
  }
}
```

## Fase 6: Pruebas y Validación

### 6.1 Pruebas Unitarias

```bash
# Ejecutar pruebas del backend
cd apps/backend
npm test

# Ejecutar pruebas del frontend
cd apps/frontend
npm test
```

### 6.2 Pruebas de Integración

```bash
# Iniciar servicios
npm run dev

# Probar endpoints de API
curl -X GET http://localhost:3001/api/health
curl -X POST http://localhost:3001/api/auth/login -d '{"email":"test@example.com","password":"password"}'
```

### 6.3 Pruebas de Multi-Tenant

```bash
# Probar aislamiento de tenant
curl -X GET http://localhost:3001/api/contacts \
  -H "x-tenant-id: company-1"

curl -X GET http://localhost:3001/api/contacts \
  -H "x-tenant-id: company-2"

# Verificar que los datos estén aislados
```

### 6.4 Pruebas de Integraciones

```bash
# Probar integración de WhatsApp
# Configurar integración en settings
# Enviar mensaje de prueba
# Verificar recepción de webhook
```

## Fase 7: Deployment

### 7.1 Actualizar Configuración de Docker

```dockerfile
# apps/backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### 7.2 Actualizar Configuración de Kubernetes

```yaml
# infra/k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  template:
    spec:
      containers:
      - name: backend
        image: sparktree/backend:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: url
```

### 7.3 Ejecutar Migración en Producción

```bash
# 1. Backup de base de datos actual
pg_dump sparktree > backup.sql

# 2. Ejecutar migraciones
npm run db:migrate:master

# 3. Migrar datos
psql sparktree < migration-script.sql

# 4. Crear bases de datos de tenants
# (script automatizado)

# 5. Deploy de nueva versión
kubectl apply -f infra/k8s/
```

## Fase 8: Limpieza

### 8.1 Eliminar Código Viejo

```bash
# Después de validar que todo funciona
# Eliminar carpetas viejas
rm -rf apps/backend/src/modules/bots
rm -rf apps/backend/src/knowledge
rm -rf apps/backend/src/webhooks

# Eliminar archivos viejos
rm apps/backend/src/old-file.ts
```

### 8.2 Actualizar Documentación

```bash
# Actualizar README.md
# Actualizar docs/api/
# Actualizar docs/deployment/
```

### 8.3 Commit de Migración

```bash
git add .
git commit -m "feat: migrate to V2 architecture with DDD and monorepo"
git push origin feature/migration-to-v2

# Crear pull request
# Solicitar code review
# Merge a main después de aprobación
```

## Checklist de Migración

### Backend
- [ ] Migrar módulo de autenticación
- [ ] Migrar módulo de integraciones
- [ ] Migrar módulo de knowledge retrieval
- [ ] Migrar módulo de bots/automation
- [ ] Migrar webhooks
- [ ] Implementar middleware multi-tenant
- [ ] Actualizar configuración de TypeScript
- [ ] Actualizar package.json
- [ ] Probar endpoints de API
- [ ] Probar aislamiento multi-tenant

### Frontend
- [ ] Migrar páginas a módulos de negocio
- [ ] Migrar componentes compartidos
- [ ] Migrar hooks personalizados
- [ ] Migrar servicios API
- [ ] Actualizar configuración de rutas
- [ ] Actualizar configuración de TypeScript
- [ ] Actualizar package.json
- [ ] Probar navegación
- [ ] Probar integración con API

### Base de Datos
- [ ] Ejecutar migraciones de master DB
- [ ] Migrar datos existentes
- [ ] Crear bases de datos de tenants
- [ ] Migrar datos a tenants
- [ ] Probar RLS policies
- [ ] Probar aislamiento de datos

### Integraciones
- [ ] Migrar configuración de WhatsApp
- [ ] Migrar configuración de Instagram
- [ ] Migrar configuración de otras plataformas
- [ ] Probar webhooks
- [ ] Probar envío de mensajes
- [ ] Probar configuración flexible (API vs QR)

### Deployment
- [ ] Actualizar configuración de Docker
- [ ] Actualizar configuración de Kubernetes
- [ ] Probar deployment en staging
- [ ] Ejecutar migración en producción
- [ ] Monitorear post-deployment
- [ ] Limpiar código viejo

## Troubleshooting

### Problemas Comunes

**Error: Cannot find module**
- Solución: Verificar que los paths en tsconfig.json estén correctos
- Solución: Asegurarse de que los imports usen los nuevos paths

**Error: Tenant not found**
- Solución: Verificar que el tenant ID esté en el header o subdominio
- Solución: Verificar que la empresa exista en la base de datos maestra

**Error: Database connection failed**
- Solución: Verificar que las bases de datos de tenants existan
- Solución: Verificar que las credenciales de base de datos sean correctas

**Error: Webhook not received**
- Solución: Verificar que la URL del webhook sea correcta
- Solución: Verificar que el middleware de tenant esté funcionando

## Soporte

Si encuentras problemas durante la migración:

1. Revisa la documentación en `docs/ARCHITECTURE_V2.md`
2. Revisa los logs de la aplicación
3. Verifica la configuración de variables de entorno
4. Consulta con el equipo de arquitectura

## Recursos Adicionales

- [Documentación de Arquitectura V2](ARCHITECTURE_V2.md)
- [Guía de Desarrollo](docs/onboarding/development-guide.md)
- [Documentación de API](docs/api/openapi.yaml)
- [Guía de Deployment](docs/deployment/deployment-guide.md)
