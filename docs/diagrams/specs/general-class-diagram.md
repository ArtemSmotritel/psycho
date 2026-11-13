# Загальна діаграма класів (підрозділ 3.3.5)

UML class diagram, platform-specific level (PSM). Section 3.3.5. The appendix letter is not fixed yet. DRAFT FOR REVIEW. The adaptation (modules shown as classes) still needs supervisor sign-off.

## Conventions

- Boxes contain the NAME ONLY (plus a stereotype). No attributes, no operations.
- The code has no classes. Every backend `<Feature>Service` / `<Feature>Repo` is a frozen `const` object, and every route file exports a Hono router. Draw each as a class with the stereotype `<<module>>`. Use these stereotypes:
  - `<<routes>>` — a Hono router (one per route file)
  - `<<service>>` — `<Feature>Service`
  - `<<repository>>` — `<Feature>Repo`
  - `<<middleware>>` — middleware set in `middlewares/auth.ts`
  - `<<page>>` — a React Router route module (frontend)
  - `<<component>>` — a significant React component
  - `<<hook>>` — a React hook
  - `<<context>>` — React context
  - `<<api-service>>` — frontend HTTP wrapper over Axios
  - `<<external>>` — a system outside the product
- Arrow types:
  - dashed arrow with open head `..>` = "uses / depends on" (every arrow in this diagram unless noted)
  - dashed arrow labelled `HTTP` = frontend api-service to backend routes
  - dashed arrow labelled `WebSocket` = whiteboard link
- Layout: frontend block on the left or top, backend block on the right or bottom. Inside the backend, draw layers as horizontal bands from top to bottom: Routes, Services, Repositories. The middleware class sits beside the Routes band. External systems at the bottom.
- To keep the diagram readable, draw the three frontend groups (Pages, Components, API services) as UML packages and the three backend layers as packages. Packages are only frames, not classes.

---

# PART A. BACKEND

## A1. Composition root

- `App` `<<module>>` (`config/app.ts`) — mounts all routers, `setSession`, `setUserRole`, the error handler, and the better-auth handler at `/api/auth/*`.
- `Server` `<<module>>` (`index.ts`) — starts Bun, registers the WebSocket handler and calls `NotificationsCron`.

Arrows:

- Server ..> App
- Server ..> NotificationsCron
- App ..> every Routes class in A2 (16 arrows; draw as one arrow from App to the Routes package)
- App ..> AuthMiddlewares
- App ..> BetterAuth

## A2. Routes layer (16 classes)

Source file → class name → mount path. All routes call exactly one Service (one arrow each).

| Class | File | Mount path | Calls |
| --- | --- | --- | --- |
| ClientSelfRoutes | clients/routes.ts | /api/clients (me) | ClientsService |
| ClientRoutes | clients/routes.ts | /api/clients | ClientsService |
| UserRoutes | users/routes.ts | /api/users | UsersService |
| AppointmentRoutes | appointments/routes.ts | /api/clients/:clientId/appointments | AppointmentsService |
| PsychoAppointmentRoutes | appointments/psycho-routes.ts | /api/psycho/appointments | AppointmentsService |
| ClientAppointmentRoutes | appointments/client-routes.ts | /api/client/appointments | AppointmentsService |
| WhiteboardRoutes | whiteboard/routes.ts | /api/whiteboard (WebSocket) | WhiteboardService, AppointmentsService |
| FileRoutes | files/routes.ts | /api/files | FilesService |
| PsychoProgressRoutes | progress/psycho-routes.ts | /api/clients/:clientId/progress/impressions | ProgressService |
| ClientProgressRoutes | progress/client-routes.ts | /api/client/progress | ProgressService |
| PsychoAttachmentRoutes | attachments/psycho-routes.ts | /api/clients/:clientId/appointments/:appointmentId/attachments | AttachmentsService |
| ClientAttachmentRoutes | attachments/client-routes.ts | /api/client/appointments/:appointmentId/attachments | AttachmentsService |
| PsychoDashboardRoutes | dashboard/psycho-routes.ts | /api/psycho/dashboard | DashboardService |
| ClientDashboardRoutes | dashboard/client-routes.ts | /api/client/dashboard | DashboardService |
| InvitationRoutes | invitations/routes.ts | /api/invitations | InvitationsService |
| AssociativeImageRoutes | associative-images/routes.ts | /api/associative-images | AssociativeImagesService |

Notes:

- `notifications` has NO routes. It is started by cron.
- `WhiteboardRoutes` is the only router that calls two services. It also uses `BetterAuth` to read the session of the WebSocket upgrade request.

## A3. Middleware

- `AuthMiddlewares` `<<middleware>>` (`middlewares/auth.ts`). Contents (for the text, not for the box): `setSession`, `authorized`, `setUserRole`, `onlyPsychoRequest`, `onlyClientRequest`, `onlyLinkedClient`, `ownsFiles`.

Arrows:

- every Routes class ..> AuthMiddlewares (draw one arrow from the Routes package)
- AuthMiddlewares ..> UsersRepo (`setUserRole` reads the active role)
- AuthMiddlewares ..> ClientsRepo (`onlyLinkedClient`)
- AuthMiddlewares ..> FilesRepo (`ownsFiles`)

Remark for the text: the middleware calls repositories directly. This differs from the rule "routes do not import repos". Code wins, so draw it and explain it in one sentence.

## A4. Services layer (11 classes)

UsersService, ClientsService, InvitationsService, AppointmentsService, WhiteboardService, AttachmentsService, FilesService, AssociativeImagesService, DashboardService, ProgressService, NotificationsService.

### Service → Service (verified in imports and calls)

| From | To | Why |
| --- | --- | --- |
| AppointmentsService | WhiteboardService | `clearState` when an appointment is deleted or changed |
| AttachmentsService | AppointmentsService | `getForPsycho`, `getForClient` — access check |
| AttachmentsService | FilesService | `cleanupOrphans` |
| AttachmentsService | NotificationsService | `enqueueRecCreated` |
| InvitationsService | ClientsService | `linkClientToPsycho` |
| InvitationsService | NotificationsService | `enqueueInvitationCreated` |
| AssociativeImagesService | FilesService | `cleanupOrphans`, `removeFromDisk` |
| FilesService | FilesService | `removeFromDisk` — internal; DO NOT draw |

Services with NO service dependency: UsersService, ClientsService, WhiteboardService, FilesService, DashboardService, ProgressService.

### Service → own Repo (one arrow each, 1:1)

UsersService → UsersRepo, ClientsService → ClientsRepo, InvitationsService → InvitationsRepo, AppointmentsService → AppointmentsRepo, WhiteboardService → WhiteboardRepo, AttachmentsService → AttachmentsRepo, FilesService → FilesRepo, AssociativeImagesService → AssociativeImagesRepo, DashboardService → DashboardRepo, ProgressService → ProgressRepo, NotificationsService → NotificationsRepo.

### Service → foreign Repo (verified)

| From | To |
| --- | --- |
| AppointmentsService | ClientsRepo |
| AttachmentsService | AppointmentsRepo |
| InvitationsService | ClientsRepo |
| InvitationsService | UsersRepo |
| AssociativeImagesService | FilesRepo |
| DashboardService | ClientsRepo |
| ProgressService | ClientsRepo |

### Service → cross-cutting (optional; draw as one note or skip)

All services ..> `Db` (`config/db`, `db.begin` transactions) and `AppErrors` (`errors/index`, `AppError` subclasses). `Logger` is used by AppointmentsService, NotificationsService. Draw these three as small classes at the bottom, or leave out and state in the text. Recommendation: draw `Db` only, to show the link to PostgreSQL.

### Service → utility and external

- AppointmentsService ..> GoogleMeetClient `<<module>>` (`utils/google-meet.ts`: create, reschedule, delete the calendar event)
- GoogleMeetClient ..> GoogleCalendarAPI `<<external>>`
- FilesService ..> FileStorage `<<external>>` (the local file system: write, `removeFromDisk`)

## A5. Repositories layer (11 classes)

UsersRepo, ClientsRepo, InvitationsRepo, AppointmentsRepo, WhiteboardRepo, AttachmentsRepo, FilesRepo, AssociativeImagesRepo, DashboardRepo, ProgressRepo, NotificationsRepo.

Repo → Repo (shared SQL fragments, imported constants, not calls):

| From | To | Imported |
| --- | --- | --- |
| AttachmentsRepo | AppointmentsRepo | `APPOINTMENT_STATUS_EXPR` |
| DashboardRepo | AppointmentsRepo | `APPOINTMENT_STATUS_EXPR`, `appointmentColumns` |
| DashboardRepo | AttachmentsRepo | `ATTACHMENT_SELECT`, `REACTION_JSON_EXPR` |
| ProgressRepo | AttachmentsRepo | `ATTACHMENT_SELECT`, `REACTION_JSON_EXPR` |

Label these arrows "SQL fragment" so they are not read as calls.

Every Repo ..> `Db`. Draw `Db` ..> `PostgreSQL` `<<external>>`.

## A6. Notifications internals (the only feature with more than Service + Repo)

Classes (all `<<module>>`): `NotificationsCron` (`cron.ts`), `ScheduledProducers` (`producers.ts`, registry `SCHEDULED`), `NotificationDefinitions` (`definitions.ts`, registry `DEFINITIONS`), `EmailTemplates` (`templates.ts`), `EmailService` (`email-service.ts`). Local detail is in `docs/diagrams/reminders-class-diagram.puml`; the general diagram keeps these five boxes only.

Arrows:

- Server ..> NotificationsCron (see A1)
- NotificationsCron ..> NotificationsService (two cron ticks: decision every 10 min, sender every 1 min)
- NotificationsService ..> ScheduledProducers
- NotificationsService ..> NotificationDefinitions
- NotificationsService ..> EmailService
- NotificationsService ..> NotificationsRepo (already in A4)
- ScheduledProducers ..> NotificationsRepo
- NotificationDefinitions ..> NotificationsRepo
- NotificationDefinitions ..> EmailTemplates
- EmailTemplates ..> InvitationsService (`buildInviteLink`)
- EmailService ..> Brevo `<<external>>`

## A7. Other classes inside features (decide: draw or fold)

- `AttachmentCheck` (`attachments/attachment-check.ts`) — used by AttachmentsService, uses AttachmentsRepo. Recommendation: draw it as a small class between AttachmentsService and AttachmentsRepo.
- `UploadValidation` (`files/upload-validation.ts`) — used by FilesService and FileRoutes. Recommendation: fold into the text, do not draw.
- `attachments/limits.ts`, `attachments/schemas.ts`, every `models.ts` — constants, zod schemas, types. Do not draw.
- `BetterAuth` (`utils/auth.ts`) — draw. Arrows: App ..> BetterAuth, WhiteboardRoutes ..> BetterAuth. BetterAuth ..> Db and ..> GoogleOAuth `<<external>>`. It also creates the `clients` and `psychologists` rows through database hooks (mention in the text).

---

# PART B. FRONTEND

Only significant classes. Left out on purpose: `components/ui/*` (shadcn), `components/common/*` (small layout and utility pieces, except `ProtectedRoute` and `RoleLayout`), small hooks, `lib/*`, `utils/*`, `models/*`.

Rule for hooks: the small `useCurrent*`, `useResource`, `useClientList`, `useCreateAppointment`, `useAssociativeImageBrowser`, `useHasActiveAppointment` hooks are NOT drawn. Their dependency on an API service is drawn from the page or component that calls them. `useWhiteboardSync` is drawn because it owns the WebSocket link.

## B1. Pages (`<<page>>`)

Route table (`routes.ts`) → box name. DECIDED: pages keep their file names, written with the folder (`psychologist/session`, `client/profile`, `home`). The folder removes the clash between the two `layout` files and the two dashboards. Table column "Class" = box name:

Shared and entry:

| Class | File | URL |
| --- | --- | --- |
| root | root.tsx | — (app shell, provides AuthContext) |
| home | routes/home.tsx | / |
| login | routes/login.tsx | /login |
| auth-callback | routes/auth-callback.tsx | /auth/callback |
| role-select | routes/role-select.tsx | /role-select |
| invite | routes/invite.tsx | /invite |

Psychologist area:

| Class | File | URL |
| --- | --- | --- |
| psychologist/layout | routes/psychologist/layout.tsx | layout for all /psycho/* |
| psychologist/dashboard.index | dashboard.index.tsx | /psycho |
| psychologist/clients | clients.tsx | /psycho/clients |
| psychologist/client-layout | client-layout.tsx | /psycho/clients/:clientId (nested layout) |
| psychologist/client-profile | client-profile.tsx | /psycho/clients/:clientId |
| psychologist/client-progress | client-progress.tsx | …/progress |
| psychologist/client-sessions | client-sessions.tsx | …/appointments |
| psychologist/session | session.tsx | …/appointments/:appointmentId |
| psychologist/session-attachment | session-attachment.tsx | …/appointments/:appointmentId/attachment/:attachmentId |
| psychologist/live-session | live-session.tsx | …/appointments/:appointmentId/live |
| psychologist/invitations | invitations.tsx | /psycho/invitations |
| psychologist/associative-images | associative-images.tsx | /psycho/associative-images |
| psychologist/sessions | sessions.tsx | /psycho/appointments |

Client area:

| Class | File | URL |
| --- | --- | --- |
| client/layout | routes/client/layout.tsx | layout for all client pages |
| client/dashboard | dashboard.tsx | /client |
| client/profile | profile.tsx | /me |
| client/appointments | appointments.tsx | /client/appointments |
| client/appointment-detail | appointment-detail.tsx | /client/appointments/:appointmentId |
| client/live-appointment | live-appointment.tsx | …/live |
| client/attachment-detail | attachment-detail.tsx | …/attachment/:attachmentId |
| client/progress | progress.tsx | /client/progress |

Not drawn: `routes/well-known.tsx` (a catch-all for `/.well-known/*`, no logic).

Layout arrows (nesting of route modules):

- psychologist/layout ..> RoleLayout
- client/layout ..> RoleLayout
- RoleLayout ..> AppSidebar
- RoleLayout ..> ProtectedRoute
- ProtectedRoute ..> AuthContext
- AppSidebar ..> AuthContext
- AppSidebar ..> AppointmentApiService (via `useHasActiveAppointment`)
- root ..> AuthContext
- Optional, if you want the route tree: psychologist/client-layout is nested in psychologist/layout; all pages with a `/psycho/*` URL are children of psychologist/layout; all client pages are children of client/layout. Draw this as a UML package nesting (Pages → «Psychologist» and «Client» sub-packages), not as arrows.

## B2. Significant components (`<<component>>`)

Forms and dialogs:

- `SessionForm` (includes the three `session-form/*` parts: client selector, date-time picker, Google Meet fields)
- `ClientForm`
- `AddClientByEmailDialog`
- `AddImageDialog`
- `PingConflictDialog`
- `PostSessionFollowUpDialog`
- `PostSessionImpressionDialog`

Attachments:

- `AttachmentForm` (includes `attachment-form/ImageSection` and `VoiceRecordingSection`)
- `AttachmentList` (includes `AttachmentListItem`, `AttachmentListHeader`)
- `AttachmentDetail` (includes `AttachmentMediaPreview`)
- `AppointmentNotesPanel`
- `AppointmentRecommendationsPanel`
- `RecommendationReactionBlock`

Associative images:

- `AssociativeImagePicker`
- `AssociativeImageBrowser`

Whiteboard:

- `Excalidraw` `<<external>>` (the Excalidraw 0.18 React component, loaded lazily on the two live pages)
- `WhiteboardCursorOverlay`
- `WhiteboardImageInsert`
- `WhiteboardSnapshot`
- `useWhiteboardSync` `<<hook>>`

Context and shell: `AuthContext` `<<context>>`, `AppSidebar`, `RoleLayout`, `ProtectedRoute`.

Folded (not drawn): `DeleteAttachmentButton`, `EditAttachmentButton`, `LimitedAddButton`, `AttachmentCountBadge`, `AppointmentStatusBadge`, `ActionsSection`. They are small. Mention in the text that `DeleteAttachmentButton` and `EditAttachmentButton` call `AttachmentApiService` and read `AuthContext`.

## B3. API services (`<<api-service>>`)

Name = file name in `services/`. Add the suffix `ApiService` so the names do not collide with the backend classes.

- `ApiClient` (`services/api.ts`: Axios instance, `baseURL /api`, `withCredentials`, role header, 401 and role-mismatch events)
- `AuthApiService` (`auth.service.ts`: better-auth client)
- `UserApiService`
- `ClientApiService`
- `InvitationApiService`
- `AppointmentApiService`
- `AttachmentApiService`
- `RecommendationApiService`
- `ImpressionApiService`
- `FileApiService`
- `AssociativeImageApiService`
- `DashboardApiService`
- `ProgressApiService`

Arrows:

- every `*ApiService` except `AuthApiService` ..> ApiClient (one arrow from the package)
- AuthContext ..> ApiClient (it registers the unauthorized and role-mismatch listeners)

## B4. Page → component, page → API service, component → component, component → API service

Verified against the `import` lines of each file. "(via hook)" means the dependency exists through a small hook that is not drawn.

Shared pages:

- login ..> AuthContext, AuthApiService
- auth-callback ..> AuthContext, InvitationApiService
- role-select ..> AuthContext
- invite ..> AuthContext, AuthApiService, InvitationApiService
- home — no arrows

Psychologist pages:

- psychologist/dashboard.index ..> DashboardApiService
- psychologist/clients ..> ClientApiService, AddClientByEmailDialog
- psychologist/client-layout ..> ClientApiService (via hook)
- psychologist/client-profile ..> ClientApiService, SessionForm
- psychologist/client-progress ..> ImpressionApiService
- psychologist/client-sessions ..> AppointmentApiService
- psychologist/session ..> AppointmentApiService, AttachmentApiService, AttachmentList, AppointmentNotesPanel, AppointmentRecommendationsPanel, PostSessionFollowUpDialog, WhiteboardSnapshot, SessionForm, PingConflictDialog, ClientApiService (via hook)
- psychologist/session-attachment ..> AttachmentDetail, AttachmentApiService (via hook)
- psychologist/live-session ..> AppointmentApiService, ClientApiService (via hook), useWhiteboardSync, Excalidraw, WhiteboardCursorOverlay, WhiteboardImageInsert, AppointmentNotesPanel, AppointmentRecommendationsPanel, PostSessionFollowUpDialog
- psychologist/invitations ..> InvitationApiService
- psychologist/associative-images ..> AssociativeImageApiService, FileApiService, AddImageDialog
- psychologist/sessions ..> AppointmentApiService, SessionForm

Client pages:

- client/dashboard ..> DashboardApiService, RecommendationApiService, AttachmentList, RecommendationReactionBlock
- client/profile ..> ClientApiService, ClientForm
- client/appointments ..> AppointmentApiService
- client/appointment-detail ..> AppointmentApiService (via hook), AttachmentApiService, FileApiService, RecommendationApiService, AttachmentForm, AttachmentList, RecommendationReactionBlock, WhiteboardSnapshot
- client/live-appointment ..> AppointmentApiService, AttachmentApiService, FileApiService, useWhiteboardSync, Excalidraw, WhiteboardCursorOverlay, AttachmentForm, AttachmentList, PostSessionImpressionDialog
- client/attachment-detail ..> AttachmentDetail, AttachmentApiService (via hook)
- client/progress ..> ProgressApiService

Component → component:

- SessionForm ..> PingConflictDialog
- SessionForm ..> ClientApiService (via hook), AppointmentApiService (via hook)
- PostSessionFollowUpDialog ..> SessionForm
- PostSessionImpressionDialog ..> AttachmentForm, AttachmentApiService, FileApiService
- AddClientByEmailDialog ..> ClientApiService, InvitationApiService
- AppointmentNotesPanel ..> AttachmentForm, AttachmentApiService, FileApiService
- AppointmentRecommendationsPanel ..> AttachmentForm, AttachmentApiService, FileApiService, RecommendationApiService
- AttachmentDetail ..> RecommendationReactionBlock, RecommendationApiService
- AttachmentForm ..> AssociativeImagePicker (through `ImageSection`)
- AssociativeImagePicker ..> AssociativeImageBrowser
- WhiteboardImageInsert ..> AssociativeImageBrowser
- AssociativeImageBrowser ..> AssociativeImageApiService (via hook)
- AuthContext ..> UserApiService, AuthApiService, ApiClient

Hook:

- useWhiteboardSync ..> Excalidraw (calls the imperative API, `updateScene`)
- useWhiteboardSync ..> WhiteboardRoutes — dashed arrow labelled `WebSocket` (`/api/whiteboard/:appointmentId`)

---

# PART C. CROSS-BOUNDARY LINKS (frontend → backend)

Draw ONE dashed arrow per row, labelled `HTTP`. Source = API service, target = backend Routes class. Verified against the request paths in each service file.

| Frontend | Backend | Paths |
| --- | --- | --- |
| AuthApiService | BetterAuth | /api/auth/* |
| UserApiService | UserRoutes | /users/me, /users/me/role |
| ClientApiService | ClientRoutes, ClientSelfRoutes | /clients, /clients/:id, /clients/me |
| InvitationApiService | InvitationRoutes | /invitations, /invitations/:id, /invitations/accept |
| AppointmentApiService | AppointmentRoutes, PsychoAppointmentRoutes, ClientAppointmentRoutes | /clients/:id/appointments…, /psycho/appointments, /psycho/appointments/all, /client/appointments… |
| AttachmentApiService | PsychoAttachmentRoutes, ClientAttachmentRoutes | …/attachments… |
| RecommendationApiService | PsychoAttachmentRoutes, ClientAttachmentRoutes | …/attachments/:id/reply (psycho), …/reaction (client) |
| ImpressionApiService | PsychoProgressRoutes | /clients/:id/progress/impressions |
| ProgressApiService | ClientProgressRoutes | /client/progress/psychologists, /client/progress/:psychoId |
| FileApiService | FileRoutes | /files/upload (file download links also point to /files) |
| AssociativeImageApiService | AssociativeImageRoutes | /associative-images… |
| DashboardApiService | PsychoDashboardRoutes, ClientDashboardRoutes | /psycho/dashboard, /client/dashboard |
| useWhiteboardSync | WhiteboardRoutes | WebSocket /api/whiteboard/:appointmentId |

Check before final: the path list of `FileApiService` for download calls, and whether `AttachmentApiService` also uploads files through `FileApiService` only. I verified the list of paths with `grep`, not every call site.

---

# PART D. EXTERNAL CLASSES (bottom of the diagram, `<<external>>`)

- `PostgreSQL` — target of `Db`
- `FileStorage` — local disk; target of FilesService
- `GoogleCalendarAPI` — target of GoogleMeetClient
- `GoogleOAuth` — target of BetterAuth
- `Brevo` — target of EmailService

---

# Figures (decided)

The body of section 3.3.5 has two figures. The appendix holds the same content as one full diagram.

- Figure 1 (backend): Part A, plus the backend side of Part D. Boxes: App, Server, 16 Routes, AuthMiddlewares, 11 Services, 11 Repos, 5 notifications internals, AttachmentCheck, GoogleMeetClient, BetterAuth, Db, and the five external classes. About 50 boxes.
- Figure 2 (frontend and its links): Parts B and C. Boxes: 27 pages, about 24 components, 13 API services, ApiClient, AuthContext, useWhiteboardSync. The 16 backend Routes classes (plus BetterAuth) appear in Figure 2 as plain boxes without their own arrows, only as targets of the HTTP and WebSocket arrows. About 70 boxes.
- Because Figure 2 is large, group the pages in two frames («psychologist» and «client», with the shared and entry pages in a third frame). Place the API services in one row between the components and the backend Routes boxes.

# Decisions recorded

- SUPERSEDES the "Figures (decided)" box counts above: the class-level version (about 120 boxes) was unreadable. The `.puml` files now draw group-level boxes (one box per backend domain; grouped frontend boxes) with names inside and arrows only between groups. This file stays the full class-level reference for the text and for an appendix table of arrows.

- Two figures (backend, frontend), as above.
- Draw `Db`, `AttachmentCheck`, `BetterAuth`. Do not draw `AppErrors`, `Logger`.
- Page boxes use file names with the folder.
- Section number 3.3.5.
