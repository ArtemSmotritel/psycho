# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Behavior and rules to follow at all times

Do not write code unless asked to explicitly. Perform all tasks fully. Do not finish until the task is complete.

**Review first.** Present the proposed design, plan or draft for review *before* doing the work, rather than producing the artifact and explaining afterwards. The point is to steer direction early, before effort is spent.

**Scope plans to the work being asked for now.** Do not include numbered steps for follow-up work that will be triggered later — even when a multi-step migration (add new → swap frontend → remove legacy) is the obvious eventual shape. Mention deferred phases under an "Out of scope" heading so the relationship is clear, but keep them out of the implementation steps. Each phase is planned and executed as its own focused unit.

**Prefer extending an existing abstraction over adding an ad-hoc helper** — even when the helper would be a one-liner. Before proposing a new repo method or glue function to bridge two abstractions, check whether one of them could be extended to cover the case directly, and propose that path first. A new helper is fine when no existing abstraction owns the concern; ad-hoc glue next to an abstraction that already owns it is a smell.

**Verify against the code.** Where code and prose (paper, plans, docs) disagree, the code wins.

## Commands

### Backend (`backend/`)
```bash
bun run dev               # Start dev server with hot reload (port 3000)
bun run typecheck         # Run tsc --noEmit (type-check only)
bun run migrate           # Run pending SQL migrations
bun run migration:create -- --name <name>  # Create a new migration file
```

### Frontend (`frontend/`)
```bash
bun run dev         # Start dev server with HMR (port 5173)
bun run build       # Production build
bun run typecheck   # Type generation + tsc check
```

## Architecture

### Overview
Monorepo with two independent apps: a Bun/Hono REST API (`backend/`) and a Bun/React Router v7 SPA (`frontend/`). No shared packages between them.

### Backend (`backend/src/`)
- **Layering rules**: `docs/backend-feature-conventions.md` is authoritative — read it before drafting any plan for backend feature work. In short: routes do zod validation, auth middleware, exactly one service call, return HTTP (no business validation, no try/catch, no repo or db imports); services own business validation, `db.begin` transactions, external APIs and filesystem effects, and throw `AppError` subclasses with specific `code`s the frontend branches on; repos are raw SQL only, return `T | null`, never throw, and alias snake_case → camelCase in the SQL. Modules are exported as frozen `const` namespaces (`<Feature>Service`, `<Feature>Repo`). Single-resource responses use envelopes (`{ client }`); list responses return the service result directly.
- **Runtime**: Bun. **Framework**: Hono. **Database**: PostgreSQL via Bun's native `SQL` template literal client (no ORM).
- **Auth**: `better-auth` with Google OAuth. On user creation, both a `clients` row and a `psychologists` row are automatically created via `databaseHooks`.
- **Role system**: The frontend sends a custom header `Helpsycho-User-Role` with value `psycho` or `client`. The `setUserRole` middleware reads this and sets `c.get('role')`. Guard middlewares `onlyPsychoRequest` / `onlyClientRequest` enforce access.
- **Feature structure**: Each domain in `src/features/<domain>/` has `routes.ts`, `services.ts`, `models.ts`, and optionally `middlewares.ts`. Services contain raw SQL queries.
- **Module aliases** (defined in `tsconfig.json`): `config/*`, `models/*`, `services/*`, `routes/*`, `utils/*`, `errors/*` — all resolve to `src/<alias>/`.
- **Migrations**: Raw `.sql` files in `src/migrations/`, named `<timestamp>_<name>.sql`, tracked in a `schema_migrations` table.

### Frontend (`frontend/app/`)
- **Framework**: React Router v7 (framework mode). **Styling**: TailwindCSS v4. **UI**: shadcn/ui components in `components/ui/`.
- **Routes**: Defined in `routes.ts` using React Router's config API. URL structure: `/:role/clients/:clientId/appointments/:appointmentId/...`. The `:role` segment is part of the URL but not used for access control on the frontend — `useRoleGuard` hook uses the auth context user role.
- **API client**: Axios instance in `services/api.ts` with `baseURL: '/api'` and `withCredentials: true`. Domain-specific service files wrap it (e.g. `appointment.service.ts`, `client.service.ts`).
- **Auth state**: `AuthContext` (`contexts/auth-context.tsx`) + `better-auth/react` client (`services/auth.service.ts`). On session resolve, fetches the user via `userService.getMe()` and tracks `activeRole` (`psycho` | `client` | null). Listens for `API_UNAUTHORIZED_EVENT` and `API_ROLE_MISMATCH_EVENT` to log out or resync.
- **Models**: TypeScript interfaces in `app/models/` define frontend data shapes (may differ from DB schema).

### Environment Variables (Backend)
```
FRONTEND_URL          # Allowed CORS origin
PGUSERNAME / PGPASSWORD / PGHOST / PGPORT / PGDATABASE
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI
ENV                   # Set to "production" to hide stack traces
```

## Testing

- Write tests with **minimum mocks** — prefer real implementations and the existing test infrastructure over mocking.
- Follow the patterns established by existing tests in the codebase (helpers, fixtures, test DB setup, etc.).
- Do not mock the database or internal services unless there is no alternative.

## Code Style
- Backend & Frontend uses Prettier (config in root `.prettierrc.json`): 4-space indent, semicolons, trailing commas.
  - run `bunx prettier -w ./backend` & `bunx prettier -w ./frontend` from the repo root to apply the prettier format

### Logging
- **Frontend**: never call `console.error` / `console.log` directly. Use `logIfNotProd` from `frontend/app/utils/logger.ts` — a single env-aware helper is the centralized place to evolve logging behaviour (silencing in prod, a future Sentry hookup). Keep its API extensible if new levels are needed.
- **Backend**: has its own `backend/src/utils/logger.ts` (`log.warn`, etc.). Don't conflate the two — the `logIfNotProd` rule is frontend-only.

## Thesis / paper work

This repo also carries the bachelor's thesis the codebase exists to support. When writing paper prose, section text or diagram specs, read `docs/CLAUDE.md` first — it holds the writing rules and the current state of each chapter.
