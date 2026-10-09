# Sparktree CRM

Multi-tenant SaaS CRM platform with omnichannel integration.

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL (multi-tenant)
- **Cache**: Redis
- **Queue**: Bull
- **Infrastructure**: Docker + Kubernetes

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Redis >= 6.0

### Installation

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ../workers && npm install

# Setup environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Run database migrations
npm run db:migrate:master

# Start development servers
npm run dev:backend    # Backend server on port 3000
npm run dev:frontend   # Frontend server on port 5173
npm run dev:workers    # Background workers
```

## Project Structure

```
sparktree-crm/
├── backend/               # Node.js API server
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── frontend/              # React application
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── workers/               # Background workers
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── database/              # Database migrations and scripts
│   ├── migrations/
│   ├── seeds/
│   └── scripts/
├── shared/                # Shared code
│   └── types/             # Shared TypeScript types
├── docs/                  # Documentation
├── k8s/                   # Kubernetes configurations
├── monitoring/            # Monitoring configurations
└── scripts/               # Utility scripts
```

## Documentation

See [docs/ARCHITECTURE_V2.md](docs/ARCHITECTURE_V2.md) for detailed architecture documentation.

## License

MIT
