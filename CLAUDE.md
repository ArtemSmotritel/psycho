# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Behavior and rules to follow at all times

Do not write code unless asked to explicitly. Perform all tasks fully. Do not finish until the task is complete.

## Commands

### Backend (`backend/`)
```bash
bun run dev               # Start dev server with hot reload (port 3000)
bun run migrate           # Run pending SQL migrations
bun run migration:create -- --name <name>  # Create a new migration file
```

### Frontend (`frontend/`)
```bash
npm run dev         # Start dev server with HMR (port 5173)
npm run build       # Production build
npm run typecheck   # Type generation + tsc check
```

## Architecture

### Overview
Monorepo with two independent apps: a Bun/Hono REST API (`backend/`) and a React Router v7 SPA (`frontend/`). No shared packages between them.

### Backend (`backend/src/`)
- **Runtime**: Bun. **Framework**: Hono. **Database**: PostgreSQL via Bun's native `SQL` template literal client (no ORM).
- **Auth**: `better-auth` with Google OAuth. On user creation, both a `clients` row and a `psychologists` row are automatically created via `databaseHooks`.
- **Role system**: The frontend sends a custom header `Garik-User-Role` with value `psycho` or `client`. The `setUserRole` middleware reads this and sets `c.get('role')`. Guard middlewares `onlyPsychoRequest` / `onlyClientRequest` enforce access.
- **Feature structure**: Each domain in `src/features/<domain>/` has `routes.ts`, `services.ts`, `models.ts`, and optionally `middlewares.ts`. Services contain raw SQL queries.
- **Module aliases** (defined in `tsconfig.json`): `config/*`, `models/*`, `services/*`, `routes/*`, `utils/*`, `errors/*` — all resolve to `src/<alias>/`.
- **Migrations**: Raw `.sql` files in `src/migrations/`, named `<timestamp>_<name>.sql`, tracked in a `schema_migrations` table.

### Frontend (`frontend/app/`)
- **Framework**: React Router v7 (framework mode). **Styling**: TailwindCSS v4. **UI**: shadcn/ui components in `components/ui/`.
- **Routes**: Defined in `routes.ts` using React Router's config API. URL structure: `/:role/clients/:clientId/sessions/:sessionId/...`. The `:role` segment is part of the URL but not used for access control on the frontend — `useRoleGuard` hook uses the auth context user role.
- **API client**: Axios instance in `services/api.ts` with `baseURL: '/api'` and `withCredentials: true`. Domain-specific service files wrap it (e.g. `session.service.ts`, `client.service.ts`).
- **Auth state**: `AuthContext` (`contexts/auth-context.tsx`) + `better-auth/react` client (`services/auth.service.ts`). Note: `auth-context.tsx` currently has hardcoded fake user for development.
- **Models**: TypeScript interfaces in `app/models/` define frontend data shapes (may differ from DB schema).
- **Test data**: `app/test-data/` contains fake data used by many routes that haven't been wired to the real API yet.

### Environment Variables (Backend)
```
FRONTEND_URL          # Allowed CORS origin
PGUSERNAME / PGPASSWORD / PGHOST / PGPORT / PGDATABASE
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI
ENV                   # Set to "production" to hide stack traces
```

## Code Style
- Backend uses Biome (config in root `biome.json`): 4-space indent, semicolons, trailing commas.
- Frontend uses the default prettier config from the React Router template.
