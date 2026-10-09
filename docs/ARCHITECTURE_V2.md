# Sparktree CRM - Arquitectura Enterprise V2

## Visión General

Sparktree CRM es un SaaS multiempresa orientado a gestión de clientes, ventas e integración omnicanal. Esta arquitectura está diseñada siguiendo principios de Domain-Driven Design (DDD), Feature-Based Architecture y SOLID para garantizar escalabilidad, mantenibilidad y profesionalismo.

## 1. Estructura del Monorepo

```
sparktree-crm/
├── apps/
│   ├── frontend/                    # Aplicación React principal
│   ├── backend/                     # API Node.js principal
│   ├── workers/                     # Workers para tareas asíncronas
│   └── admin/                       # Panel de administración (futuro)
├── packages/
│   ├── shared/                      # Utilidades compartidas
│   ├── types/                       # Tipos TypeScript compartidos
│   ├── ui/                          # Componentes UI compartidos
│   ├── database/                    # Migraciones y seeds
│   └── config/                      # Configuración compartida
├── docs/
│   ├── architecture/                # Documentación de arquitectura
│   ├── api/                         # Documentación de API
│   ├── deployment/                  # Guías de deployment
│   └── onboarding/                  # Guías de onboarding
├── infra/
│   ├── docker/                      # Configuraciones Docker
│   ├── k8s/                         # Manifests Kubernetes
│   ├── terraform/                   # Infraestructura como código
│   └── monitoring/                  # Configuración de monitoreo
├── scripts/
│   ├── migration/                   # Scripts de migración
│   ├── deployment/                  # Scripts de deployment
│   └── maintenance/                 # Scripts de mantenimiento
├── .github/
│   └── workflows/                   # GitHub Actions
├── package.json                     # Root package.json
├── turbo.json                       # Configuración Turborepo
├── docker-compose.yml               # Docker Compose local
├── .env.example                     # Variables de entorno ejemplo
└── README.md                        # Documentación principal
```

### Descripción de Carpetas Principales

**apps/**: Contiene todas las aplicaciones desplegables
- `frontend/`: Aplicación React para usuarios finales
- `backend/`: API REST/GraphQL principal
- `workers/`: Procesadores de colas, jobs programados
- `admin/`: Panel de administración interna (futuro)

**packages/**: Código compartido entre aplicaciones
- `shared/`: Utilidades, helpers, constantes
- `types/`: Definiciones TypeScript compartidas
- `ui/`: Componentes React reutilizables
- `database/`: Migraciones, seeds, scripts DB
- `config/`: Configuración centralizada

**docs/**: Documentación completa del proyecto
- `architecture/`: Diagramas, decisiones arquitectónicas
- `api/`: Especificaciones OpenAPI/Swagger
- `deployment/`: Guías de deployment
- `onboarding/`: Guías para nuevos desarrolladores

**infra/**: Infraestructura como código
- `docker/`: Dockerfiles, docker-compose
- `k8s/`: Manifests Kubernetes
- `terraform/`: Recursos cloud (AWS/GCP/Azure)
- `monitoring/`: Prometheus, Grafana, Loki

**scripts/**: Scripts de automatización
- `migration/`: Migraciones de datos
- `deployment/`: CI/CD scripts
- `maintenance/`: Tareas de mantenimiento

## 2. Estructura del Frontend (Feature-Based)

```
apps/frontend/src/
├── modules/
│   ├── auth/                        # Módulo de autenticación
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── ForgotPassword.tsx
│   │   │   └── ResetPassword.tsx
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── AuthGuard.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── usePermissions.ts
│   │   ├── services/
│   │   │   └── authService.ts
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   └── validations/
│   │       └── auth.validations.ts
│   │
│   ├── dashboard/                   # Dashboard principal
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   └── Analytics.tsx
│   │   ├── components/
│   │   │   ├── StatsCard.tsx
│   │   │   ├── ActivityChart.tsx
│   │   │   └── RecentActivity.tsx
│   │   ├── hooks/
│   │   │   ├── useDashboardStats.ts
│   │   │   └── useAnalytics.ts
│   │   ├── services/
│   │   │   └── dashboardService.ts
│   │   └── types/
│   │       └── dashboard.types.ts
│   │
│   ├── crm/                         # Módulo CRM general
│   │   ├── pages/
│   │   │   ├── CRMHome.tsx
│   │   │   └── Reports.tsx
│   │   ├── components/
│   │   │   ├── CRMLayout.tsx
│   │   │   └── QuickActions.tsx
│   │   ├── hooks/
│   │   │   └── useCRMData.ts
│   │   └── services/
│   │       └── crmService.ts
│   │
│   ├── contacts/                    # Gestión de contactos
│   │   ├── pages/
│   │   │   ├── ContactsList.tsx
│   │   │   ├── ContactDetail.tsx
│   │   │   └── ContactForm.tsx
│   │   ├── components/
│   │   │   ├── ContactCard.tsx
│   │   │   ├── ContactTable.tsx
│   │   │   ├── ContactFilters.tsx
│   │   │   └── ContactForm.tsx
│   │   ├── hooks/
│   │   │   ├── useContacts.ts
│   │   │   ├── useContact.ts
│   │   │   └── useContactFilters.ts
│   │   ├── services/
│   │   │   └── contactService.ts
│   │   ├── types/
│   │   │   └── contact.types.ts
│   │   └── validations/
│   │       └── contact.validations.ts
│   │
│   ├── leads/                       # Gestión de leads
│   │   ├── pages/
│   │   │   ├── LeadsList.tsx
│   │   │   ├── LeadDetail.tsx
│   │   │   └── LeadCapture.tsx
│   │   ├── components/
│   │   │   ├── LeadCard.tsx
│   │   │   ├── LeadScore.tsx
│   │   │   └── LeadSource.tsx
│   │   ├── hooks/
│   │   │   ├── useLeads.ts
│   │   │   └── useLeadScoring.ts
│   │   ├── services/
│   │   │   └── leadService.ts
│   │   └── types/
│   │       └── lead.types.ts
│   │
│   ├── pipeline/                    # Pipeline de ventas
│   │   ├── pages/
│   │   │   ├── PipelineView.tsx
│   │   │   ├── PipelineSettings.tsx
│   │   │   └── DealDetail.tsx
│   │   ├── components/
│   │   │   ├── PipelineBoard.tsx
│   │   │   ├── PipelineColumn.tsx
│   │   │   ├── DealCard.tsx
│   │   │   └── DragDropBoard.tsx
│   │   ├── hooks/
│   │   │   ├── usePipeline.ts
│   │   │   └── useDealOperations.ts
│   │   ├── services/
│   │   │   └── pipelineService.ts
│   │   ├── types/
│   │   │   └── pipeline.types.ts
│   │   └── validations/
│   │       └── pipeline.validations.ts
│   │
│   ├── inbox/                       # Inbox omnicanal
│   │   ├── pages/
│   │   │   ├── InboxList.tsx
│   │   │   ├── ConversationView.tsx
│   │   │   └── MessageComposer.tsx
│   │   ├── components/
│   │   │   ├── ConversationList.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── PlatformIndicator.tsx
│   │   │   └── QuickReply.tsx
│   │   ├── hooks/
│   │   │   ├── useConversations.ts
│   │   │   ├── useMessages.ts
│   │   │   └── useRealtimeMessages.ts
│   │   ├── services/
│   │   │   └── inboxService.ts
│   │   ├── types/
│   │   │   └── inbox.types.ts
│   │   └── integrations/
│   │       ├── whatsapp/
│   │       ├── instagram/
│   │       ├── messenger/
│   │       └── email/
│   │
│   ├── projects/                    # Gestión de proyectos
│   │   ├── pages/
│   │   │   ├── ProjectsList.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   └── TaskBoard.tsx
│   │   ├── components/
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   └── GanttChart.tsx
│   │   ├── hooks/
│   │   │   ├── useProjects.ts
│   │   │   └── useTasks.ts
│   │   ├── services/
│   │   │   └── projectService.ts
│   │   └── types/
│   │       └── project.types.ts
│   │
│   ├── settings/                    # Configuración
│   │   ├── pages/
│   │   │   ├── CompanySettings.tsx
│   │   │   ├── UserSettings.tsx
│   │   │   ├── Integrations.tsx
│   │   │   ├── Billing.tsx
│   │   │   └── TeamSettings.tsx
│   │   ├── components/
│   │   │   ├── SettingsLayout.tsx
│   │   │   ├── IntegrationCard.tsx
│   │   │   └── BillingPlan.tsx
│   │   ├── hooks/
│   │   │   ├── useSettings.ts
│   │   │   └── useIntegrations.ts
│   │   ├── services/
│   │   │   └── settingsService.ts
│   │   └── types/
│   │       └── settings.types.ts
│   │
│   └── billing/                     # Facturación
│       ├── pages/
│       │   ├── Plans.tsx
│       │   ├── Subscription.tsx
│       │   ├── Invoices.tsx
│       │   └── PaymentMethods.tsx
│       ├── components/
│       │   ├── PlanCard.tsx
│       │   ├── InvoiceTable.tsx
│       │   └── PaymentForm.tsx
│       ├── hooks/
│       │   ├── useBilling.ts
│       │   └── useSubscription.ts
│       ├── services/
│       │   └── billingService.ts
│       └── types/
│           └── billing.types.ts
│
├── shared/
│   ├── components/                  # Componentes compartidos
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── PageContainer.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Table.tsx
│   │   └── feedback/
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── Toast.tsx
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   └── useWindowSize.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   └── contexts/
│       ├── AuthContext.tsx
│       ├── ThemeContext.tsx
│       └── CompanyContext.tsx
│
├── config/
│   ├── routes.tsx                   # Configuración de rutas
│   ├── theme.ts                     # Configuración de tema
│   └── api.ts                       # Configuración de API
│
├── App.tsx                          # Componente principal
├── main.tsx                         # Punto de entrada
└── vite.config.ts                   # Configuración Vite
```

## 3. Estructura del Backend (DDD)

```
apps/backend/src/
├── modules/
│   ├── auth/                        # Dominio de autenticación
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   └── auth.routes.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   └── jwt.service.ts
│   │   ├── repositories/
│   │   │   └── auth.repository.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   ├── register.dto.ts
│   │   │   └── refresh.dto.ts
│   │   ├── validators/
│   │   │   └── auth.validators.ts
│   │   └── domain/
│   │       ├── value-objects/
│   │       │   ├── email.vo.ts
│   │       │   └── password.vo.ts
│   │       └── services/
│   │           └── password.service.ts
│   │
│   ├── companies/                   # Dominio de empresas
│   │   ├── controllers/
│   │   │   ├── company.controller.ts
│   │   │   └── company.routes.ts
│   │   ├── services/
│   │   │   ├── company.service.ts
│   │   │   └── subscription.service.ts
│   │   ├── repositories/
│   │   │   └── company.repository.ts
│   │   ├── entities/
│   │   │   ├── company.entity.ts
│   │   │   └── subscription.entity.ts
│   │   ├── dto/
│   │   │   ├── create-company.dto.ts
│   │   │   └── update-company.dto.ts
│   │   └── validators/
│   │       └── company.validators.ts
│   │
│   ├── users/                       # Dominio de usuarios
│   │   ├── controllers/
│   │   │   ├── user.controller.ts
│   │   │   └── user.routes.ts
│   │   ├── services/
│   │   │   ├── user.service.ts
│   │   │   └── profile.service.ts
│   │   ├── repositories/
│   │   │   └── user.repository.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   └── update-user.dto.ts
│   │   └── validators/
│   │       └── user.validators.ts
│   │
│   ├── roles/                       # Dominio de roles y permisos
│   │   ├── controllers/
│   │   │   ├── role.controller.ts
│   │   │   └── role.routes.ts
│   │   ├── services/
│   │   │   ├── role.service.ts
│   │   │   └── permission.service.ts
│   │   ├── repositories/
│   │   │   └── role.repository.ts
│   │   ├── entities/
│   │   │   ├── role.entity.ts
│   │   │   └── permission.entity.ts
│   │   ├── dto/
│   │   │   ├── create-role.dto.ts
│   │   │   └── assign-permission.dto.ts
│   │   └── validators/
│   │       └── role.validators.ts
│   │
│   ├── contacts/                    # Dominio de contactos
│   │   ├── controllers/
│   │   │   ├── contact.controller.ts
│   │   │   └── contact.routes.ts
│   │   ├── services/
│   │   │   ├── contact.service.ts
│   │   │   └── contact-enrichment.service.ts
│   │   ├── repositories/
│   │   │   └── contact.repository.ts
│   │   ├── entities/
│   │   │   ├── contact.entity.ts
│   │   │   └── contact-attribute.entity.ts
│   │   ├── dto/
│   │   │   ├── create-contact.dto.ts
│   │   │   └── update-contact.dto.ts
│   │   ├── validators/
│   │   │   └── contact.validators.ts
│   │   └── domain/
│   │       ├── value-objects/
│   │       │   ├── phone.vo.ts
│   │       │   └── email.vo.ts
│   │       └── services/
│   │           └── deduplication.service.ts
│   │
│   ├── leads/                       # Dominio de leads
│   │   ├── controllers/
│   │   │   ├── lead.controller.ts
│   │   │   └── lead.routes.ts
│   │   ├── services/
│   │   │   ├── lead.service.ts
│   │   │   ├── lead-scoring.service.ts
│   │   │   └── lead-nurturing.service.ts
│   │   ├── repositories/
│   │   │   └── lead.repository.ts
│   │   ├── entities/
│   │   │   ├── lead.entity.ts
│   │   │   └── lead-activity.entity.ts
│   │   ├── dto/
│   │   │   ├── create-lead.dto.ts
│   │   │   └── update-lead.dto.ts
│   │   └── validators/
│   │       └── lead.validators.ts
│   │
│   ├── pipeline/                    # Dominio de pipeline de ventas
│   │   ├── controllers/
│   │   │   ├── pipeline.controller.ts
│   │   │   ├── deal.controller.ts
│   │   │   └── pipeline.routes.ts
│   │   ├── services/
│   │   │   ├── pipeline.service.ts
│   │   │   ├── deal.service.ts
│   │   │   └── stage-transition.service.ts
│   │   ├── repositories/
│   │   │   ├── pipeline.repository.ts
│   │   │   └── deal.repository.ts
│   │   ├── entities/
│   │   │   ├── pipeline.entity.ts
│   │   │   ├── stage.entity.ts
│   │   │   └── deal.entity.ts
│   │   ├── dto/
│   │   │   ├── create-pipeline.dto.ts
│   │   │   ├── create-deal.dto.ts
│   │   │   └── move-deal.dto.ts
│   │   └── validators/
│   │       └── pipeline.validators.ts
│   │
│   ├── tasks/                       # Dominio de tareas
│   │   ├── controllers/
│   │   │   ├── task.controller.ts
│   │   │   └── task.routes.ts
│   │   ├── services/
│   │   │   ├── task.service.ts
│   │   │   └── reminder.service.ts
│   │   ├── repositories/
│   │   │   └── task.repository.ts
│   │   ├── entities/
│   │   │   ├── task.entity.ts
│   │   │   └── reminder.entity.ts
│   │   ├── dto/
│   │   │   ├── create-task.dto.ts
│   │   │   └── update-task.dto.ts
│   │   └── validators/
│   │       └── task.validators.ts
│   │
│   ├── inbox/                       # Dominio de inbox
│   │   ├── controllers/
│   │   │   ├── conversation.controller.ts
│   │   │   ├── message.controller.ts
│   │   │   └── inbox.routes.ts
│   │   ├── services/
│   │   │   ├── conversation.service.ts
│   │   │   ├── message.service.ts
│   │   │   └── routing.service.ts
│   │   ├── repositories/
│   │   │   ├── conversation.repository.ts
│   │   │   └── message.repository.ts
│   │   ├── entities/
│   │   │   ├── conversation.entity.ts
│   │   │   ├── message.entity.ts
│   │   │   └── conversation-tag.entity.ts
│   │   ├── dto/
│   │   │   ├── send-message.dto.ts
│   │   │   └── assign-conversation.dto.ts
│   │   └── validators/
│   │       └── inbox.validators.ts
│   │
│   ├── messages/                    # Dominio de mensajes
│   │   ├── controllers/
│   │   │   └── message.controller.ts
│   │   ├── services/
│   │   │   ├── message-processing.service.ts
│   │   │   └── message-queue.service.ts
│   │   ├── repositories/
│   │   │   └── message.repository.ts
│   │   ├── entities/
│   │   │   └── message.entity.ts
│   │   ├── dto/
│   │   │   └── process-message.dto.ts
│   │   └── domain/
│   │       └── services/
│   │           └── sentiment-analysis.service.ts
│   │
│   ├── integrations/                # Dominio de integraciones
│   │   ├── controllers/
│   │   │   ├── integration.controller.ts
│   │   │   └── integration.routes.ts
│   │   ├── services/
│   │   │   ├── integration.service.ts
│   │   │   └── webhook.service.ts
│   │   ├── repositories/
│   │   │   └── integration.repository.ts
│   │   ├── entities/
│   │   │   ├── integration.entity.ts
│   │   │   └── integration-config.entity.ts
│   │   ├── dto/
│   │   │   ├── connect-integration.dto.ts
│   │   │   └── update-config.dto.ts
│   │   ├── platforms/
│   │   │   ├── whatsapp/
│   │   │   │   ├── whatsapp.service.ts
│   │   │   │   ├── whatsapp-webhook.controller.ts
│   │   │   │   └── whatsapp-message-handler.ts
│   │   │   ├── instagram/
│   │   │   │   ├── instagram.service.ts
│   │   │   │   ├── instagram-webhook.controller.ts
│   │   │   │   └── instagram-message-handler.ts
│   │   │   ├── messenger/
│   │   │   │   ├── messenger.service.ts
│   │   │   │   ├── messenger-webhook.controller.ts
│   │   │   │   └── messenger-message-handler.ts
│   │   │   ├── telegram/
│   │   │   │   ├── telegram.service.ts
│   │   │   │   ├── telegram-webhook.controller.ts
│   │   │   │   └── telegram-message-handler.ts
│   │   │   ├── email/
│   │   │   │   ├── email.service.ts
│   │   │   │   └── email-handler.ts
│   │   │   └── tiktok/
│   │   │       ├── tiktok.service.ts
│   │   │       └── tiktok-webhook.controller.ts
│   │   └── validators/
│   │       └── integration.validators.ts
│   │
│   ├── billing/                     # Dominio de facturación
│   │   ├── controllers/
│   │   │   ├── billing.controller.ts
│   │   │   ├── subscription.controller.ts
│   │   │   └── billing.routes.ts
│   │   ├── services/
│   │   │   ├── billing.service.ts
│   │   │   ├── subscription.service.ts
│   │   │   ├── invoice.service.ts
│   │   │   └── payment.service.ts
│   │   ├── repositories/
│   │   │   ├── billing.repository.ts
│   │   │   └── subscription.repository.ts
│   │   ├── entities/
│   │   │   ├── invoice.entity.ts
│   │   │   ├── payment.entity.ts
│   │   │   └── subscription.entity.ts
│   │   ├── dto/
│   │   │   ├── create-subscription.dto.ts
│   │   │   └── process-payment.dto.ts
│   │   └── validators/
│   │       └── billing.validators.ts
│   │
│   └── analytics/                   # Dominio de analíticas
│       ├── controllers/
│       │   ├── analytics.controller.ts
│       │   └── analytics.routes.ts
│       ├── services/
│       │   ├── analytics.service.ts
│       │   ├── reporting.service.ts
│       │   └── export.service.ts
│       ├── repositories/
│       │   └── analytics.repository.ts
│       ├── entities/
│       │   ├── metric.entity.ts
│       │   └── report.entity.ts
│       ├── dto/
│       │   ├── query-metrics.dto.ts
│       │   └── generate-report.dto.ts
│       └── validators/
│           └── analytics.validators.ts
│
├── shared/
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── postgres.config.ts
│   │   │   ├── connection.ts
│   │   │   └── migrations.ts
│   │   ├── cache/
│   │   │   ├── redis.config.ts
│   │   │   └── cache.service.ts
│   │   ├── queue/
│   │   │   ├── bull.config.ts
│   │   │   └── queue.service.ts
│   │   ├── storage/
│   │   │   ├── s3.config.ts
│   │   │   └── storage.service.ts
│   │   └── websocket/
│   │       ├── socket.config.ts
│   │       └── socket.service.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── tenant.middleware.ts
│   │   ├── rbac.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error-handler.middleware.ts
│   │   └── rate-limit.middleware.ts
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   ├── tenant.guard.ts
│   │   └── permission.guard.ts
│   ├── decorators/
│   │   ├── auth.decorator.ts
│   │   ├── tenant.decorator.ts
│   │   └── permissions.decorator.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── date.utils.ts
│   │   ├── string.utils.ts
│   │   └── validation.utils.ts
│   ├── constants/
│   │   ├── errors.ts
│   │   ├── status.ts
│   │   └── permissions.ts
│   └── config/
│       ├── app.config.ts
│       ├── database.config.ts
│       └── external-services.config.ts
│
├── core/
│   ├── domain/
│   │   ├── base.entity.ts
│   │   ├── base.repository.ts
│   │   └── base.service.ts
│   └── application/
│       ├── commands/
│       ├── queries/
│       └── events/
│
├── api/
│   ├── routes.ts                    # Rutas principales
│   ├── app.ts                       # Express app
│   └── server.ts                    # Server entry point
│
└── main.ts                          # Entry point
```

## 4. Estrategia Multi-Tenant

### 4.1 Arquitectura Multi-Tenant

**Estrategia: Database-per-Tenant con Shared Schema**

```
PostgreSQL Instance
├── sparktree_master                 # Base de datos maestra
│   ├── companies                    # Empresas/tenants
│   ├── users                        # Usuarios globales
│   ├── roles                        # Roles globales
│   ├── permissions                  # Permisos globales
│   └── subscriptions                # Suscripciones
│
├── tenant_{company_id}_001           # Base de datos tenant 1
│   ├── contacts                     # Contactos del tenant
│   ├── leads                        # Leads del tenant
│   ├── pipelines                    # Pipelines del tenant
│   ├── deals                        # Deals del tenant
│   ├── tasks                        # Tareas del tenant
│   ├── conversations                # Conversaciones del tenant
│   ├── messages                     # Mensajes del tenant
│   └── custom_fields                # Campos personalizados
│
├── tenant_{company_id}_002           # Base de datos tenant 2
│   └── ... (mismo esquema)
│
└── tenant_{company_id}_003           # Base de datos tenant 3
    └── ... (mismo esquema)
```

### 4.2 Aislamiento de Tenant

**Middleware de Tenant:**
```typescript
// shared/middleware/tenant.middleware.ts
export class TenantMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    // Extraer tenant del header o subdominio
    const tenantId = req.headers['x-tenant-id'] || 
                      req.subdomain?.split('.')[0];
    
    // Validar tenant existe
    const tenant = await this.tenantService.findById(tenantId);
    if (!tenant) {
      throw new TenantNotFoundException();
    }
    
    // Establecer conexión a base de datos del tenant
    req.tenantId = tenantId;
    req.dbConnection = await this.getTenantConnection(tenantId);
    
    next();
  }
}
```

**Decorator de Tenant:**
```typescript
// shared/decorators/tenant.decorator.ts
export const Tenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId;
  }
);
```

### 4.3 Entidades Multi-Tenant

**Entidad Base:**
```typescript
// core/domain/base.entity.ts
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'NOW()' })
  updatedAt: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;
}
```

### 4.4 Row-Level Security (RLS)

**Políticas RLS en PostgreSQL:**
```sql
-- Política para asegurar que los usuarios solo ven datos de su tenant
CREATE POLICY tenant_isolation ON contacts
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Función para establecer tenant actual
CREATE OR REPLACE FUNCTION set_tenant_id()
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', current_setting('request.headers.x-tenant-id'), true);
END;
$$ LANGUAGE plpgsql;
```

## 5. Módulos Principales del MVP

### 5.1 Autenticación

**Funcionalidades:**
- Registro de usuarios
- Login con email/password
- Login con Google/Microsoft (OAuth)
- Recuperación de contraseña
- 2FA (Two-Factor Authentication)
- Gestión de sesiones
- Refresh tokens

**Flujo:**
1. Usuario se registra → Se crea usuario en master DB
2. Login → Se valida credenciales → Se genera JWT
3. Cada request → Se valida JWT → Se extrae tenant → Se conecta a DB tenant

### 5.2 Empresas (Companies)

**Funcionalidades:**
- Creación de empresas
- Configuración de empresa
- Gestión de suscripción
- Límites de uso
- Configuración de integraciones

**Relaciones:**
- Company → Users (1:N)
- Company → Subscription (1:1)
- Company → Integrations (1:N)

### 5.3 Usuarios

**Funcionalidades:**
- Gestión de usuarios por empresa
- Asignación de roles
- Perfil de usuario
- Actividad del usuario
- Permisos granulares

**Relaciones:**
- User → Company (N:1)
- User → Roles (N:N)
- User → Activities (1:N)

### 5.4 Roles y Permisos

**Funcionalidades:**
- Roles predefinidos (Admin, Sales, Support, etc.)
- Roles personalizados
- Permisos granulares por módulo
- Herencia de permisos
- RBAC (Role-Based Access Control)

**Estructura:**
```
Role
├── Admin (todos los permisos)
├── Sales Manager (ventas, pipeline, contacts)
├── Sales Agent (ventas asignadas, contacts)
├── Support Agent (inbox, conversations)
└── Viewer (solo lectura)
```

### 5.5 Contactos

**Funcionalidades:**
- CRUD de contactos
- Deduplicación de contactos
- Enriquecimiento de datos
- Campos personalizados
- Etiquetas y segmentación
- Historial de interacciones

**Relaciones:**
- Contact → Company (N:1)
- Contact → Conversations (1:N)
- Contact → Deals (1:N)
- Contact → Activities (1:N)

### 5.6 Leads

**Funcionalidades:**
- Captura de leads
- Lead scoring
- Lead nurturing
- Conversión a contactos
- Seguimiento automático
- Fuentes de leads

**Relaciones:**
- Lead → Company (N:1)
- Lead → Contact (1:1 opcional)
- Lead → Deal (1:1 opcional)

### 5.7 Pipeline de Ventas

**Funcionalidades:**
- Pipelines personalizados
- Etapas personalizables
- Drag & drop de deals
- Automatización de transiciones
- Predicción de cierre
- Métricas de pipeline

**Relaciones:**
- Pipeline → Company (N:1)
- Pipeline → Stages (1:N)
- Stage → Deals (1:N)
- Deal → Contact (N:1)

### 5.8 Tareas

**Funcionalidades:**
- Creación de tareas
- Asignación a usuarios
- Fechas de vencimiento
- Recordatorios
- Tareas recurrentes
- Checklists

**Relaciones:**
- Task → Company (N:1)
- Task → AssignedUser (N:1)
- Task → Deal/Contact (N:1)

### 5.9 Conversaciones

**Funcionalidades:**
- Inbox unificado
- Conversaciones multi-canal
- Asignación de conversaciones
- Notas internas
- Etiquetas de conversación
- Respuestas rápidas
- Automatización de respuestas

**Relaciones:**
- Conversation → Company (N:1)
- Conversation → Contact (1:1)
- Conversation → Messages (1:N)
- Conversation → AssignedUser (N:1)

### 5.10 Mensajes

**Funcionalidades:**
- Envío de mensajes
- Recepción de webhooks
- Cola de procesamiento
- Análisis de sentimiento
- Archivos adjuntos
- Plantillas de mensajes

**Relaciones:**
- Message → Conversation (N:1)
- Message → Platform (N:1)

## 6. Esquema de Base de Datos PostgreSQL

### 6.1 Base de Datos Maestra (sparktree_master)

```sql
-- Companies/Empresas
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  domain VARCHAR(255) UNIQUE,
  logo_url TEXT,
  industry VARCHAR(100),
  size VARCHAR(50),
  plan_tier VARCHAR(50) DEFAULT 'free',
  status VARCHAR(50) DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Usuarios
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  phone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  last_login_at TIMESTAMP,
  email_verified_at TIMESTAMP,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(255),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Roles
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Asignación de Roles a Usuarios
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  UNIQUE(user_id, role_id)
);

-- Permisos
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  UNIQUE(module, action)
);

-- Suscripciones
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  plan_id VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Facturas
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  stripe_invoice_id VARCHAR(255),
  amount DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending',
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  pdf_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Integraciones (Nivel Master)
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'disconnected',
  config JSONB DEFAULT '{}',
  webhook_url TEXT,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, platform)
);

-- Índices
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_integrations_company_id ON integrations(company_id);
```

### 6.2 Base de Datos Tenant (tenant_{company_id})

```sql
-- Contactos
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  company_name VARCHAR(255),
  title VARCHAR(100),
  avatar_url TEXT,
  source VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  tags TEXT[],
  custom_attributes JSONB DEFAULT '{}',
  lead_score INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMP
);

-- Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  source VARCHAR(50),
  status VARCHAR(50) DEFAULT 'new',
  score INTEGER DEFAULT 0,
  value DECIMAL(10, 2),
  expected_close_date DATE,
  converted_to_contact BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMP,
  notes TEXT,
  custom_attributes JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMP
);

-- Pipelines
CREATE TABLE pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID
);

-- Etapas de Pipeline
CREATE TABLE pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  order_index INTEGER NOT NULL,
  color VARCHAR(7),
  probability INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Deals/Oportunidades
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  value DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  expected_close_date DATE,
  actual_close_date DATE,
  probability INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'open',
  lost_reason TEXT,
  custom_attributes JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMP
);

-- Tareas
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(50) DEFAULT 'medium',
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  assigned_to UUID,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  reminder_sent BOOLEAN DEFAULT FALSE,
  recurring_rule JSONB,
  custom_attributes JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  deleted_at TIMESTAMP
);

-- Conversaciones
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  platform_conversation_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'open',
  assigned_to UUID,
  tags TEXT[],
  priority VARCHAR(50) DEFAULT 'normal',
  sla_deadline TIMESTAMP,
  first_message_at TIMESTAMP,
  last_message_at TIMESTAMP,
  custom_attributes JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Mensajes
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  direction VARCHAR(50) NOT NULL,
  type VARCHAR(50) DEFAULT 'text',
  content TEXT,
  metadata JSONB DEFAULT '{}',
  platform_message_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notas de Conversación
CREATE TABLE conversation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID
);

-- Actividades
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID
);

-- Campos Personalizados
CREATE TABLE custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  options TEXT[],
  is_required BOOLEAN DEFAULT FALSE,
  is_unique BOOLEAN DEFAULT FALSE,
  validation_rule TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Valores de Campos Personalizados
CREATE TABLE custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  custom_field_id UUID REFERENCES custom_fields(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  value TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(custom_field_id, entity_type, entity_id)
);

-- Índices
CREATE INDEX idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_leads_contact_id ON leads(contact_id);
CREATE INDEX idx_deals_tenant_id ON deals(tenant_id);
CREATE INDEX idx_deals_stage_id ON deals(stage_id);
CREATE INDEX idx_deals_contact_id ON deals(contact_id);
CREATE INDEX idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_conversations_tenant_id ON conversations(tenant_id);
CREATE INDEX idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX idx_conversations_platform ON conversations(platform);
CREATE INDEX idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_activities_tenant_id ON activities(tenant_id);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
```

## 7. Arquitectura de Integraciones Omnicanal

### 7.1 Diseño Desacoplado

```
┌─────────────────────────────────────────────────────────────┐
│                     Inbox Module                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Conversations│  │  Messages    │  │   Routing    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
                            │ Platform Abstraction Layer
                            │
┌─────────────────────────────────────────────────────────────┐
│              Integration Module (Platforms)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │WhatsApp  │ │Instagram │ │Messenger │ │ Telegram  │    │
│  │ Service  │ │ Service  │ │ Service  │ │ Service  │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│  ┌──────────┐ ┌──────────┐                                   │
│  │  Email   │ │  TikTok  │                                   │
│  │ Service  │ │ Service  │                                   │
│  └──────────┘ └──────────┘                                   │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
                            │ Webhooks / APIs
                            │
┌─────────────────────────────────────────────────────────────┐
│                   External Platforms                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │WhatsApp  │ │Instagram │ │Facebook  │ │ Telegram  │    │
│  │   API    │ │   API    │ │   API    │ │   API    │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│  ┌──────────┐ ┌──────────┐                                   │
│  │   SMTP   │ │  TikTok  │                                   │
│  │  /IMAP   │ │   API    │                                   │
│  └──────────┘ └──────────┘                                   │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Interfaz de Plataforma

```typescript
// modules/integrations/platforms/base-platform.interface.ts
export interface IPlatformService {
  // Configuración
  configure(config: PlatformConfig): Promise<void>;
  validateConfig(config: PlatformConfig): Promise<boolean>;
  
  // Webhooks
  handleWebhook(data: any): Promise<PlatformMessage>;
  verifyWebhookSignature(data: any, signature: string): boolean;
  
  // Mensajes
  sendMessage(to: string, content: MessageContent): Promise<MessageResult>;
  sendMedia(to: string, media: MediaContent): Promise<MessageResult>;
  sendTemplate(to: string, template: TemplateContent): Promise<MessageResult>;
  
  // Conversaciones
  getConversation(conversationId: string): Promise<Conversation>;
  listConversations(filters: ConversationFilters): Promise<Conversation[]>;
  
  // Contactos
  getContact(platformContactId: string): Promise<PlatformContact>;
  syncContact(contact: PlatformContact): Promise<void>;
  
  // Estado
  getConnectionStatus(): Promise<ConnectionStatus>;
  testConnection(): Promise<boolean>;
}
```

### 7.3 Estrategia de Configuración por Usuario

**Configuración Flexible de WhatsApp:**

```typescript
// modules/integrations/platforms/whatsapp/whatsapp-config.types.ts
export enum WhatsAppConnectionMethod {
  CLOUD_API = 'cloud_api',      // Meta Cloud API
  QR_CODE = 'qr_code',          // Baileys QR
  BUSINESS_API = 'business_api' // WhatsApp Business API
}

export interface WhatsAppConfig {
  connectionMethod: WhatsAppConnectionMethod;
  
  // Configuración Cloud API
  cloudApi?: {
    phoneNumberId: string;
    accessToken: string;
    webhookVerifyToken: string;
    webhookUrl: string;
  };
  
  // Configuración QR (Baileys)
  qrCode?: {
    sessionId: string;
    authStatePath: string;
    webhookUrl: string;
  };
  
  // Configuración Business API
  businessApi?: {
    phoneNumber: string;
    apiKey: string;
    webhookUrl: string;
  };
}

// Servicio que decide qué método usar
export class WhatsAppServiceFactory {
  createService(config: WhatsAppConfig): IPlatformService {
    switch (config.connectionMethod) {
      case WhatsAppConnectionMethod.CLOUD_API:
        return new WhatsAppCloudAPIService(config.cloudApi);
      case WhatsAppConnectionMethod.QR_CODE:
        return new WhatsAppQRService(config.qrCode);
      case WhatsAppConnectionMethod.BUSINESS_API:
        return new WhatsAppBusinessAPIService(config.businessApi);
      default:
        throw new Error('Invalid connection method');
    }
  }
}
```

### 7.4 Flujo de Integración

**1. Usuario configura integración:**
```
Usuario → Settings → Integrations → WhatsApp
→ Elige método (Cloud API o QR)
→ Ingresa credenciales según método
→ Guarda configuración
```

**2. Sistema valida y conecta:**
```
Backend → Valida configuración
→ Crea servicio según método
→ Establece webhook
→ Prueba conexión
→ Guarda en DB
```

**3. Mensajes entran:**
```
Platform → Webhook → Backend
→ PlatformService procesa
→ Convierte a formato estándar
→ Envia a módulo Inbox
→ Inbox crea conversación/mensaje
```

**4. Mensajes salen:**
```
Inbox → PlatformService
→ Determina método de conexión
→ Envia por API/QR según config
→ Actualiza estado
```

### 7.5 Configuración por Usuario en DB

```sql
-- Tabla de configuraciones de integración por usuario
CREATE TABLE user_integration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  connection_method VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  last_tested_at TIMESTAMP,
  test_result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Ejemplo de configuración para WhatsApp Cloud API
{
  "connection_method": "cloud_api",
  "cloud_api": {
    "phone_number_id": "123456789",
    "access_token": "EAABwz...",
    "webhook_verify_token": "my_secret_token",
    "webhook_url": "https://api.sparktree.com/webhooks/whatsapp"
  }
}

-- Ejemplo de configuración para WhatsApp QR
{
  "connection_method": "qr_code",
  "qr_code": {
    "session_id": "user_123_session",
    "auth_state_path": "/tmp/auth/user_123",
    "webhook_url": "https://api.sparktree.com/webhooks/whatsapp"
  }
}
```

## 8. Roadmap de Desarrollo

### 8.1 MVP (Meses 1-3)

**Fase 1: Fundamentos (Mes 1)**
- ✅ Estructura de monorepo
- ✅ Configuración de desarrollo
- ✅ Base de datos maestra
- ✅ Sistema de autenticación
- ✅ Middleware multi-tenant
- ✅ CRUD de usuarios y roles
- ✅ UI básica de login/dashboard

**Fase 2: CRM Core (Mes 2)**
- ✅ Módulo de contactos
- ✅ Módulo de leads
- ✅ Pipeline de ventas básico
- ✅ Tareas y recordatorios
- ✅ UI de CRM completo
- ✅ Búsqueda y filtrado

**Fase 3: Inbox Básico (Mes 3)**
- ✅ Módulo de conversaciones
- ✅ Módulo de mensajes
- ✅ Integración WhatsApp (Cloud API)
- ✅ Integración Email
- ✅ UI de inbox
- ✅ Asignación de conversaciones

### 8.2 V2 (Meses 4-6)

**Fase 4: Integraciones Avanzadas (Mes 4)**
- ✅ WhatsApp QR (Baileys)
- ✅ Instagram DM
- ✅ Facebook Messenger
- ✅ Telegram
- ✅ Webhooks unificados
- ✅ Enrutamiento inteligente

**Fase 5: Automatización (Mes 5)**
- ✅ Workflows de automatización
- ✅ Reglas de negocio
- ✅ Triggers y acciones
- ✅ Lead nurturing automático
- ✅ Respuestas automáticas
- ✅ SLA y alertas

**Fase 6: Analíticas (Mes 6)**
- ✅ Dashboard de analíticas
- ✅ Reportes personalizados
- ✅ Métricas de ventas
- ✅ Análisis de conversaciones
- ✅ Exportación de datos
- ✅ Integración con BI tools

### 8.3 V3 (Meses 7-9)

**Fase 7: Escalabilidad (Mes 7)**
- ✅ Optimización de base de datos
- ✅ Caching con Redis
- ✅ Colas con Bull/RabbitMQ
- ✅ Workers distribuidos
- ✅ Load balancing
- ✅ CDN para assets

**Fase 8: AI y ML (Mes 8)**
- ✅ Lead scoring con ML
- ✅ Análisis de sentimiento
- ✅ Respuestas sugeridas
- ✅ Clasificación automática
- ✅ Predicción de churn
- ✅ Knowledge base con RAG

**Fase 9: Enterprise (Mes 9)**
- ✅ SSO (SAML, LDAP)
- ✅ Audit logs
- ✅ Advanced security
- ✅ Custom branding
- ✅ White-label
- ✅ Enterprise support

## 9. Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Browser    │  │  Mobile App  │  │  Desktop App │         │
│  │   (React)    │  │   (React)    │  │   (Electron) │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                            ▲
                            │ HTTPS/WSS
                            │
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY / CDN                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Nginx/     │  │   Cloudflare │  │   Load       │         │
│  │   Traefik    │  │     CDN      │  │  Balancer    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                            ▲
                            │
                            │
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Frontend   │  │    Backend   │  │    Workers   │         │
│  │   (React)    │  │   (Node.js)  │  │   (Node.js)  │         │
│  │              │  │              │  │              │         │
│  │  - Modules   │  │  - Modules   │  │  - Queues    │         │
│  │  - State     │  │  - Controllers│  │  - Jobs      │         │
│  │  - API       │  │  - Services   │  │  - Schedulers│         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                            ▲
                            │
                            │
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ PostgreSQL   │  │    Redis     │  │    S3/MinIO  │         │
│  │              │  │              │  │              │         │
│  │ - Master DB  │  │  - Cache     │  │  - Files     │         │
│  │ - Tenant DBs │  │  - Sessions  │  │  - Media     │         │
│  │ - Replicas   │  │  - Pub/Sub   │  │  - Backups   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                            ▲
                            │
                            │
┌─────────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Docker/    │  │  Kubernetes  │  │   Terraform  │         │
│  │   Compose    │  │              │  │              │         │
│  │              │  │  - Pods      │  │  - AWS/GCP   │         │
│  │  - Containers│  │  - Services  │  │  - VPC       │         │
│  │  - Networks  │  │  - Ingress   │  │  - RDS       │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                            ▲
                            │
                            │
┌─────────────────────────────────────────────────────────────────┐
│                   MONITORING & LOGGING                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Prometheus  │  │    Grafana   │  │     Loki     │         │
│  │              │  │              │  │              │         │
│  │  - Metrics   │  │  - Dashboards│  │  - Logs      │         │
│  │  - Alerts    │  │  - Alerts    │  │  - Traces    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## 10. Relaciones Entre Módulos

```
┌─────────────┐
│    Auth     │
└──────┬──────┘
       │
       ├──→ Users
       ├──→ Roles
       ├──→ Permissions
       └──→ Companies
              │
              ├──→ Contacts
              ├──→ Leads
              ├──→ Pipeline
              ├──→ Tasks
              ├──→ Inbox
              │     ├──→ Conversations
              │     └──→ Messages
              ├──→ Integrations
              │     ├──→ WhatsApp
              │     ├──→ Instagram
              │     ├──→ Messenger
              │     ├──→ Telegram
              │     ├──→ Email
              │     └──→ TikTok
              ├──→ Billing
              └──→ Analytics
```

## 11. Próximos Pasos

1. **Ejecutar migraciones de base de datos**
2. **Configurar Turborepo**
3. **Implementar módulo de autenticación**
4. **Implementar middleware multi-tenant**
5. **Crear módulos del MVP**
6. **Implementar integración WhatsApp flexible**
7. **Desarrollar UI con módulos de negocio**
8. **Configurar CI/CD**
9. **Implementar monitoreo**
10. **Documentar API**

Esta arquitectura proporciona una base sólida, escalable y mantenible para Sparktree CRM, permitiendo crecimiento futuro sin comprometer la calidad del código.
