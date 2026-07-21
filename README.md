# Helpsycho

A platform supporting a psychologist's remote practice: client management, appointment scheduling with email reminders, session recommendations, file attachments, progress tracking, and a shared whiteboard. Users sign in with Google and can act in either of two roles — psychologist or client — each seeing their own view of the shared data.

Built as a bachelor's thesis project («Система підтримки віддаленої роботи психолога»).

## Tech stack

- **Backend** (`backend/`): Bun + Hono REST API, PostgreSQL (raw SQL, no ORM), better-auth with Google OAuth
- **Frontend** (`frontend/`): React Router v7 SPA, TailwindCSS v4, shadcn/ui, Axios

The two apps are independent — no shared packages. The frontend proxies API calls to the backend and sends the active role via the `Helpsycho-User-Role` header.

## Getting started

Requires [Bun](https://bun.sh) and a running PostgreSQL instance.

```bash
# Backend (port 3000)
cd backend
cp .env.example .env   # fill in DB credentials and Google OAuth keys
bun install
bun run migrate        # apply SQL migrations
bun run dev

# Frontend (port 5173)
cd frontend
bun install
bun run dev
```

## Useful commands

| Command | Where | What it does |
| --- | --- | --- |
| `bun run typecheck` | backend / frontend | Type-check the app |
| `bun run migration:create -- --name <name>` | backend | Create a new SQL migration |
| `bun run migrate` | backend | Apply pending migrations |
| `bunx prettier -w ./backend ./frontend` | repo root | Format code |

## Project structure

```
backend/src/features/<domain>/   # routes.ts, services.ts, models.ts per domain
backend/src/migrations/          # raw .sql migrations, timestamp-named
frontend/app/routes/             # React Router v7 routes
frontend/app/services/           # Axios API client + per-domain services
docs/                            # thesis sections, diagrams, feature plans
```
