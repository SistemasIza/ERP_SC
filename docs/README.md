# SparkTree SaaS – Documentation

## Project Structure

```text
Proyecto-SAAS-SparkTree/
├── apps/
│   ├── backend/       → Node.js + Express API (TypeScript)
│   ├── frontend/      → React + Vite SPA (TypeScript)
│   └── workers/       → Async job processing (BullMQ) [Phase 10]
│
├── packages/
│   └── types/         → Shared TypeScript interfaces and DTOs
│
├── database/
│   ├── migrations/    → Versioned SQL schema changes
│   ├── seeds/         → Default data (roles, plans, etc.)
│   └── *.sql          → Legacy schema files
│
└── docs/              → Architecture and decision documentation
```

## Quick Start

```bash
# Install all workspace dependencies from root
npm install

# Run backend in development
npm run dev:backend

# Run frontend in development  
npm run dev:frontend

# Run both simultaneously
npm run dev
```

## Architecture Decisions

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architectural decisions and patterns.

## Refactoring Plan

This project is undergoing a progressive refactoring towards a modular, domain-driven architecture. See the implementation plan for current phase status.
