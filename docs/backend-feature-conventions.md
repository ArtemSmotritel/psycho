# Backend Feature Conventions

Three layers — **route → service → repo**. Each owns exactly one concern.

## File Layout

`backend/src/features/<feature>/`:

- `routes.ts` — Hono routes, request validation, status codes.
- `services.ts` — business logic, throws, transactions, external APIs.
- `repo.ts` — raw SQL. No business rules, no throws.
- `models.ts` — TS interfaces for entity shapes.
- `routes.test.ts` (+ optional `*.test.ts`).
- `middlewares.ts` (optional) — feature-specific guards.

The route module exports `<feature>Routes` and is mounted in `backend/src/config/app.ts` under `/api/<feature>`.

## Module Shape

Service and repo are exported as a frozen `const` object — namespaced call site without class boilerplate:

```ts
// repo.ts
export const AppointmentsRepo = {
    async findById(id: string): Promise<Appointment | null> { ... },
    async insert(params: { ... }): Promise<Appointment> { ... },
} as const

// services.ts
export const AppointmentsService = {
    async getForPsycho(id: string, psychoId: string, clientId: string): Promise<Appointment> { ... },
} as const
```

Naming: `<Feature>Service`, `<Feature>Repo`. Files: `services.ts`, `repo.ts`.

## Layer Responsibilities

| Concern | Route | Service | Repo |
| --- | :---: | :---: | :---: |
| Read body / params / query | ✅ | | |
| Zod schema validation | ✅ | | |
| Auth/role middleware | ✅ | | |
| Call **one** service method | ✅ | | |
| Return HTTP response + status | ✅ | | |
| Business validation (status, ownership, uniqueness) | | ✅ | |
| Throw `AppError` subclasses | | ✅ | |
| Cross-record reasoning | | ✅ | |
| Transactions (`db.begin`) | | ✅ | |
| External API calls | | ✅ | |
| Filesystem side effects | | ✅ | |
| Raw SQL | | | ✅ |
| Map snake_case → camelCase | | | ✅ |
| Return `T \| null` for "not found" | | | ✅ |

## Routes

Five things, nothing else:

1. **Zod schemas** at top of file (`zod/v4`), private to file.
2. **Mount middleware once** via `routes.use(authorized, onlyPsychoRequest)`.
3. **Extract**: `c.get('user')`, `c.req.param(...)`, `c.req.query(...)` (with inline `Number(...)` + `Math.min/Max` clamps), `c.req.valid('json')` after `zValidator`.
4. **Call exactly one service method**. Never call the repo directly.
5. **Return** with explicit status: `c.json(payload, 200|201)`, `c.body(null, 204)`. Single-resource responses go in an envelope (`{ image }`, `{ appointment }`); list responses may return the service result directly.

Must not: import `db` or repo, perform business validation, use `try/catch`, hold state.

```ts
export const appointmentRoutes = new Hono()
appointmentRoutes.use(authorized, onlyPsychoRequest)

appointmentRoutes.post('/', zValidator('json', createSchema), async (c) => {
    const user = c.get('user')
    const clientId = c.req.param('clientId')
    const body = c.req.valid('json')
    const result = await AppointmentsService.createForPsycho({ psychoId: user.id, clientId, ...body })
    return c.json(result, 201)
})
```

## Service

1. **Throws domain errors** from `errors/index` — only the service decides what's a violation.
2. **Business validation**: uniqueness, ownership, state guards, identity matches, cross-field rules not expressible in Zod (e.g. `endTime > startTime` on partial updates).
3. **Transactions** via `db.begin(async (tx) => ...)`, threading `tx` into repo methods.
4. **External APIs** (Google, email, files). Tolerate partial failure — return a flag (`meetLinkGenerationFailed`) instead of aborting.
5. **Normalize input** at the boundary (`email.toLowerCase().trim()`, etc.).
6. **Compose repo calls** — usually one service method per route handler.

Must not: run raw SQL, import from `hono`, return HTTP envelopes.

```ts
export const AppointmentsService = {
    async deleteForPsycho(appointmentId: string, psychoId: string, clientId: string) {
        const existing = await AppointmentsRepo.findByIdForPsycho(appointmentId, psychoId, clientId)
        if (!existing) throw new NotFoundError()
        if (existing.status !== 'upcoming') {
            throw new BadRequestError(
                'Only upcoming appointments can be deleted.',
                'AppointmentNotDeletable',
            )
        }
        await AppointmentsRepo.deleteById(appointmentId)
    },
} as const
```

## Repo

1. **Raw SQL** via Bun's `db` template-literal client. No ORM. Conditional fragments built with `db`...``.
2. **Alias snake_case → camelCase** in SQL: `psycho_id AS "psychoId"`.
3. **Single-row lookup → `T | null`**, list → `T[]`, count → `number`. Never throw — `null` is the signal.
4. **Primitive params only**. No HTTP context, no service types.
5. **Query-shaped, not workflow-shaped** — one logical query per method.
6. **Optional executor arg** (`executor: SQL = db`) for transaction support; add it only when needed.

Must not: throw domain errors, call other repos/services/external APIs, validate business rules, import from `hono` / `errors/index` / other features.

```ts
const columns = `id, psycho_id AS "psychoId", client_id AS "clientId", start_time AS "startTime", ...`

export const AppointmentsRepo = {
    async findById(id: string): Promise<Appointment | null> {
        const [row] = await db`SELECT ${db.unsafe(columns)} FROM appointments WHERE id = ${id}`
        return (row as Appointment) ?? null
    },
    async insert(params: { ... }): Promise<Appointment> { ... },
    async deleteById(id: string, executor: SQL = db): Promise<void> {
        await executor`DELETE FROM appointments WHERE id = ${id}`
    },
} as const
```

**Cross-feature use**: other features may import the repo for reads. Writes that change domain state go through the owning feature's service.

## Transactions

Service opens the transaction; repo writes accept an optional executor:

```ts
await db.begin(async (tx) => {
    await InvitationsRepo.markAccepted(invitation.id, tx)
    await PsychologistClientsRepo.linkOrReactivate(userId, psychoId, tx)
})
```

## Errors

Subclasses of `AppError` from `errors/index`. The global `onError` in `config/app.ts` returns `{ error, message, ...details }` with the right status. Never `new HTTPException` directly in features.

| Class | Status | When |
| --- | --- | --- |
| `NotFoundError` | 404 | Doesn't exist, or exists but isn't visible to caller. |
| `BadRequestError` | 400 | Well-formed but violates a business rule. |
| `ForbiddenError` | 403 | Authenticated, resource exists, action disallowed. |
| `ConflictError` | 409 | Valid request conflicts with current state. |
| `BadGatewayError` | 502 | Upstream third-party call prevented completion. |

Always pass a specific `code` when the FE branches on it (`AlreadyLinked`, `AppointmentNotEditable`, `MeetRescheduleFailed`). Pass `details` for extra payload:

```ts
throw new ConflictError('Overlapping appointment exists.', 'AppointmentConflict', {
    conflictingAppointmentId: conflict.id,
    conflictParticipant: conflict.conflictParticipant,
})
```

Don't: return error JSON from a service, `try/catch` an `AppError` to re-throw, add error classes inside features, throw from the repo.

## Validation

- **Routes (Zod)**: structure + primitives only — required fields, `z.email()`, `z.string().min(1)`, regex, length limits.
- **Service**: anything requiring DB lookup or cross-record reasoning — uniqueness, ownership, state guards, identity matches, partial-payload cross-field checks.
- **Repo**: nothing.

## Auth & Role Guards

- `authorized` — valid session. Always first.
- `onlyPsychoRequest` / `onlyClientRequest` — role gate via `Helpsycho-User-Role` header.
- `onlyLinkedClient` — for `:clientId`-scoped routes, verifies psycho-client link.
- `ownsFiles` — body-level guard for endpoints accepting `imageFileIds` / `audioFileIds`.

Compose in routes; don't re-implement in services. Row-level ownership checks (after lookup) live in the service.

## Refactor Checklist

1. Split `services.ts` into `services.ts` + `repo.ts`. SQL-only functions → repo; composers → service.
2. Wrap exports in `const` namespaces (`as const`). Update call sites.
3. Strip throws from the repo — replace with `return null`.
4. Move business validation from routes into service methods.
5. Replace ad-hoc `c.json({ error: ... }, status)` in routes with `throw new <X>Error(...)` in services.
6. Reduce route handlers to extract → call service → return. No `try/catch`.
7. Hoist auth middleware to one `routes.use(...)` at top of `routes.ts`.
8. Move external API calls into the service.
9. Wrap multi-write ops in `db.begin(...)`, threading `tx` through repo methods.
10. Add specific `code`s + `details` to `BadRequestError` / `ConflictError` the FE branches on.
11. Update cross-feature imports: repo for reads, service for invariant-bearing writes.
