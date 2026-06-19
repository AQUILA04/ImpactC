# ImpactC — Matrimonial Platform

A supervised matrimonial platform for church communities. Built on a decoupled three-tier stack:

| Project | Stack | Purpose |
|---|---|---|
| `backoffice-web` | Next.js 14 (App Router) | Web portal for church leaders (Responsables) |
| `backend-service` | NestJS + Prisma | REST API + Socket.io gateway |
| `mobile-client` | Expo React Native | Mobile app for singles (Célibataires) |

## Prerequisites

- **Node.js**: v18.x or v20.x+
- **npm**: v9+
- **Docker**: for PostgreSQL & Redis containers (later stories)

## Getting Started

### Install dependencies for each project

```bash
cd backoffice-web && npm install
cd ../backend-service && npm install
cd ../mobile-client && npm install
```

### Run in development mode

```bash
# Web back-office (http://localhost:3000)
cd backoffice-web && npm run dev

# Backend service (http://localhost:3001)
cd backend-service && npm run start:dev

# Mobile client (Expo dev server)
cd mobile-client && npx expo start
```

## Project Structure

```
ImpactC/
├── backoffice-web/     # Next.js 14 — Leader web portal
├── backend-service/    # NestJS — REST API + WebSocket gateway
├── mobile-client/      # Expo React Native — Singles mobile app
├── .gitignore
└── README.md
```

## Architecture

See [`_bmad-output/planning-artifacts/architecture.md`](./_bmad-output/planning-artifacts/architecture.md) for full architectural decisions.

## Development Guidelines

- All NestJS HTTP responses are wrapped in the project's standard envelope format.
- Unit tests co-located alongside implementation files using `.spec.ts` naming.
- Use `npm` (not yarn/pnpm) for lockfile consistency across all projects.
