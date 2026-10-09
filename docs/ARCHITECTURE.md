# SparkTree SaaS – Architecture Decision Records

## ADR-001: Monorepo with npm Workspaces

**Date:** 2026-06-09  
**Status:** Accepted

### Context
The project has `backend` and `frontend` in `apps/` but no workspace orchestration. Types are duplicated between frontend and backend.

### Decision
Use npm workspaces (native, no Turborepo/Lerna for now) to manage the monorepo.

### Consequences
- ✅ Shared dependencies reduce `node_modules` size
- ✅ Cross-workspace imports (`@sparktree/types`) work natively
- ✅ Single `npm install` from root
- ⚠️ All workspaces must have valid `package.json`

---

## ADR-002: Progressive Refactoring (Strangler Fig Pattern)

**Date:** 2026-06-09  
**Status:** Accepted

### Context
The codebase works in production. A complete rewrite would introduce risk and downtime.

### Decision
Refactor module by module, maintaining backward compatibility. Old imports are updated incrementally. No functionality is removed without explicit confirmation.

### Consequences
- ✅ Zero downtime during refactoring
- ✅ Each phase is independently verifiable
- ⚠️ Temporary coexistence of old and new patterns
- ⚠️ Slightly longer refactoring timeline

---

## ADR-003: Multi-Tenancy via organizationId Column

**Date:** 2026-06-09  
**Status:** Accepted

### Context
The tenant middleware already exists and resolves `organizationId` from headers or authenticated user. Database tables already have `organization_id` columns.

### Decision
Continue with shared-database, shared-schema multi-tenancy using `organization_id` as the discriminator. All queries must filter by this field.

### Consequences
- ✅ Simple to implement and maintain
- ✅ Compatible with existing Supabase setup
- ✅ Single database to manage
- ⚠️ Must enforce tenant isolation in every query (risk of data leaks if missed)

---

## ADR-004: Workers Reuse Existing BullMQ Infrastructure

**Date:** 2026-06-09  
**Status:** Accepted

### Context
BullMQ and Redis are already configured in the backend (`worker.ts`, `queueService.ts`, `messageQueueService.ts`). 

### Decision
The `apps/workers/` package will NOT reimplement queue infrastructure. It will progressively absorb the existing worker logic from the backend when ready (Phase 10).

### Consequences
- ✅ No breaking changes to existing queue processing
- ✅ Worker logic continues working in backend during transition
- ⚠️ Temporary duplication of worker configuration
